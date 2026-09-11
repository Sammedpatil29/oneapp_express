const PayoutRequest = require('../models/payoutRequestModel');
const Rider = require('../models/ridersModel');
const RiderTransaction = require('../models/riderTransactionModel');

// 1. Get all payout requests (Admin)
exports.getAllPayoutRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const payouts = await PayoutRequest.findAll({
      where,
      include: [
        {
          model: Rider,
          as: 'rider',
          attributes: ['id', 'name', 'contact', 'email', 'wallet_balance', 'commission_due']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: payouts
    });
  } catch (error) {
    console.error('Error in getAllPayoutRequests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Update payout request status (Approve / Reject)
exports.updatePayoutStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Status must be either APPROVED or REJECTED.' });
    }

    const payout = await PayoutRequest.findByPk(id, {
      include: [{ model: Rider, as: 'rider' }]
    });

    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout request not found.' });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `This payout request has already been ${payout.status.toLowerCase()}.` 
      });
    }

    const newStatus = status.toUpperCase();
    payout.status = newStatus;
    payout.admin_notes = admin_notes || payout.admin_notes;
    payout.processed_at = new Date();
    await payout.save();

    // Update associated RiderTransaction
    try {
      const txn = await RiderTransaction.findOne({
        where: {
          riderId: payout.riderId,
          reference_id: payout.payout_id
        }
      });

      if (txn) {
        txn.status = newStatus === 'APPROVED' ? 'SUCCESS' : 'FAILED';
        if (admin_notes) {
          txn.metadata = { ...(txn.metadata || {}), admin_notes };
        }
        await txn.save();
      }
    } catch (txnErr) {
      console.warn('⚠️ Notice updating RiderTransaction on payout resolution:', txnErr.message);
    }

    // If REJECTED, refund amount back to rider's wallet balance
    if (newStatus === 'REJECTED' && payout.rider) {
      const rider = payout.rider;
      const refundAmount = Number(payout.amount) || 0;
      rider.wallet_balance = Number(((Number(rider.wallet_balance) || 0) + refundAmount).toFixed(2));
      rider.commission_due = Math.max(0, -rider.wallet_balance);
      await rider.save();

      // Record refund transaction
      try {
        await RiderTransaction.create({
          riderId: rider.id,
          txnId: `TXN${Date.now()}`,
          title: `Payout Refund - Rejected Request #${payout.payout_id}`,
          amount: refundAmount,
          type: 'CREDIT',
          category: 'withdrawal',
          status: 'SUCCESS',
          reference_id: payout.payout_id,
          metadata: {
            payout_id: payout.payout_id,
            reason: admin_notes || 'Payout rejected by admin',
            upi_id: payout.upi_id
          }
        });
      } catch (refErr) {
        console.warn('⚠️ Notice recording refund transaction:', refErr.message);
      }

      console.log(`↩️ Refunded ₹${refundAmount} to Rider ${rider.id} for rejected payout #${payout.payout_id}`);
    }

    return res.status(200).json({
      success: true,
      message: `Payout request ${newStatus.toLowerCase()} successfully.`,
      data: payout
    });
  } catch (error) {
    console.error('Error in updatePayoutStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

