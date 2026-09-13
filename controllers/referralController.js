const User = require('../models/customUserModel');
const UserReferral = require('../models/userReferralModel');

/**
 * Generate a unique, readable referral code (e.g. AMIT9X2K or PINTU4M8L)
 */
async function generateUniqueReferralCode(name) {
  const cleanName = (name || 'PINTU')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);

  const prefix = cleanName.length >= 3 ? cleanName : 'PINTU';

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded ambiguous chars: 0, 1, I, O
  let uniqueCode = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    uniqueCode = `${prefix}${suffix}`;

    const existing = await User.findOne({ where: { referral_code: uniqueCode } });
    if (!existing) {
      isUnique = true;
    }
  }

  // Fallback with timestamp if high collision
  if (!isUnique) {
    uniqueCode = `PINTU${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  return uniqueCode;
}

/**
 * GET /api/referral/details
 * Fetch user's referral code, real-time statistics, and referral history
 */
async function getReferralDetails(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Backfill referral code if missing
    if (!user.referral_code) {
      const newCode = await generateUniqueReferralCode(user.first_name || user.username);
      user.referral_code = newCode;
      await user.save();
    }

    // Fetch user referrals as referrer
    const referrals = await UserReferral.findAll({
      where: { referrer_id: userId },
      include: [
        {
          model: User,
          as: 'referee',
          attributes: ['id', 'first_name', 'last_name', 'date_joined']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const totalInvites = referrals.length;
    const completedInvites = referrals.filter(r => r.status === 'COMPLETED').length;
    const totalEarnings = completedInvites * 50.0;

    const formattedReferrals = referrals.map(r => {
      const refereeName = r.referee
        ? `${r.referee.first_name || ''} ${r.referee.last_name || ''}`.trim() || 'Friend'
        : 'Friend';

      return {
        id: r.id,
        referee_name: refereeName,
        status: r.status,
        reward_amount: r.reward_amount,
        reward_credited: r.reward_credited,
        signup_date: r.createdAt
      };
    });

    return res.status(200).json({
      success: true,
      referral_code: user.referral_code,
      stats: {
        total_invites: totalInvites,
        completed_invites: completedInvites,
        total_earnings: totalEarnings,
        reward_per_referral: 50.0
      },
      referrals: formattedReferrals
    });
  } catch (error) {
    console.error('Error in getReferralDetails:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve referral details: ' + error.message });
  }
}

/**
 * POST /api/referral/validate
 * Validate a referral code during signup
 */
async function validateReferralCode(req, res) {
  try {
    const { referral_code } = req.body;
    if (!referral_code || typeof referral_code !== 'string') {
      return res.status(400).json({ success: false, valid: false, message: 'Referral code is required.' });
    }

    const cleanCode = referral_code.trim().toUpperCase();

    const referrer = await User.findOne({
      where: { referral_code: cleanCode },
      attributes: ['id', 'first_name', 'last_name']
    });

    if (!referrer) {
      return res.status(200).json({
        success: true,
        valid: false,
        message: 'Invalid or unknown referral code.'
      });
    }

    const referrerName = referrer.first_name
      ? `${referrer.first_name} ${referrer.last_name ? referrer.last_name[0] + '.' : ''}`.trim()
      : 'Pintu Member';

    return res.status(200).json({
      success: true,
      valid: true,
      referrer_name: referrerName,
      message: `Valid code from ${referrerName}! ₹50 discount will be applied.`
    });
  } catch (error) {
    console.error('Error in validateReferralCode:', error);
    return res.status(500).json({ success: false, valid: false, message: 'Error validating referral code.' });
  }
}

/**
 * Complete referral reward when referee finishes their first order or ride
 */
async function completeReferralReward(refereeUserId) {
  try {
    const referral = await UserReferral.findOne({
      where: {
        referee_id: refereeUserId,
        status: 'REGISTERED',
        reward_credited: false
      }
    });

    if (!referral) return false;

    // Update referral status to COMPLETED
    referral.status = 'COMPLETED';
    referral.reward_credited = true;
    referral.credited_at = new Date();
    await referral.save();

    // Credit referrer's total_savings and log transaction
    const referrer = await User.findByPk(referral.referrer_id);
    if (referrer) {
      const reward = referral.reward_amount || 50.0;
      referrer.total_savings = (referrer.total_savings || 0) + reward;
      const txs = Array.isArray(referrer.savings_transactions) ? [...referrer.savings_transactions] : [];
      txs.push({
        id: 'ref_reward_' + Date.now(),
        title: 'Referral Reward Earned! 🎉',
        amount: reward,
        type: 'CREDIT',
        date: new Date().toISOString(),
        description: `₹${reward} earned for referring a friend who placed their first order.`
      });
      referrer.savings_transactions = txs;
      await referrer.save();

      if (referrer.fcm_token) {
        const { sendFcmNotification } = require('../utils/fcmSender');
        sendFcmNotification(
          referrer.fcm_token,
          'Referral Reward Credited! 💰',
          `You earned ₹${reward} wallet cash! Your friend completed their first order.`
        ).catch(err => console.warn('Referral reward FCM error:', err.message));
      }
    }
    return true;
  } catch (err) {
    console.error('Error completing referral reward:', err);
    return false;
  }
}

module.exports = {
  generateUniqueReferralCode,
  getReferralDetails,
  validateReferralCode,
  completeReferralReward
};

