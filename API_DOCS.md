# API Documentation

Base URL: `http://localhost:3000` (Default)

## Authentication

### Verify Token
Checks if the JWT token is valid and if the user exists.

*   **URL:** `/verify-token`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Response:**
    *   `200 OK`: `{ success: true, valid: true, user: { ... } }`
    *   `401 Unauthorized`: `{ success: false, message: '...' }`

### Login
Checks if a user exists by phone number.

*   **URL:** `/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "phone": "1234567890"
    }
    ```
*   **Response:**
    *   `200 OK` (User found): `{ success: true, isNewUser: false, token: "...", user: { ... } }`
    *   `200 OK` (User not found): `{ success: true, isNewUser: true, message: "User not found, please register" }`

### Register
Creates a new user and returns a token.

*   **URL:** `/register`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "phone": "1234567890",
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "fcm_token": "optional_fcm_token"
    }
    ```
*   **Response:**
    *   `201 Created`: `{ success: true, message: "User created successfully", token: "...", user: { ... } }`
    *   `409 Conflict`: User already exists.

### Update FCM Token
Updates the Firebase Cloud Messaging token for push notifications.

*   **URL:** `/fcm-token`
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "fcm_token": "new_token_string"
    }
    ```

---

## Home

### Get Home Data
Fetches aggregated data for the home screen: active banners, user addresses, and active services.

*   **URL:** `/api/home`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Response:**
    *   `200 OK`:
        ```json
        {
          "success": true,
          "data": {
            "banners": [ ... ],
            "addresses": [ ... ],
            "services": [ ... ]
          }
        }
        ```

---

## Services

### Create Service
*   **URL:** `/service`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Ride",
      "subtitle": "Get a ride",
      "img": "url_to_image",
      "offers": "10% OFF",
      "width": "50%",
      "route": "/ride",
      "category": "transport",
      "city": ["New York"],
      "status": "active",
      "className": {}
    }
    ```

### Get All Services
*   **URL:** `/service`
*   **Method:** `GET`

### Get Service by ID
*   **URL:** `/service/:id`
*   **Method:** `GET`

### Update Service
*   **URL:** `/service/:id`
*   **Method:** `PUT`
*   **Body:** Full service object.

### Patch Service
*   **URL:** `/service/:id`
*   **Method:** `PATCH`
*   **Body:** Partial fields (e.g., `{ "status": "inactive" }`).

### Delete Service
*   **URL:** `/service/:id`
*   **Method:** `DELETE`

---

## Addresses

### Create Address
*   **URL:** `/api/addresses`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "user_id": 1,
      "lat": "40.7128",
      "lng": "-74.0060",
      "address": "123 Main St",
      "landmark": "Park",
      "label": "Home",
      "house_no": "101"
    }
    ```

### Get User Addresses
*   **URL:** `/api/addresses/user/:userId`
*   **Method:** `GET`

### Update Address
*   **URL:** `/api/addresses/:id`
*   **Method:** `PUT`
*   **Body:** Address fields to update.

### Delete Address
*   **URL:** `/api/addresses/:id`
*   **Method:** `DELETE`

---

## Banners

### Create Banner
*   **URL:** `/api/banners`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "img": "image_url",
      "route": "/promo",
      "is_active": true,
      "type": "hometop"
    }
    ```

### Get All Banners
*   **URL:** `/api/banners`
*   **Method:** `GET`

### Get Banner by ID
*   **URL:** `/api/banners/:id`
*   **Method:** `GET`

### Update Banner
*   **URL:** `/api/banners/:id`
*   **Method:** `PUT`
*   **Body:** Banner fields.

### Delete Banner
*   **URL:** `/api/banners/:id`
*   **Method:** `DELETE`

---

## Events

### Create Event
*   **URL:** `/api/events`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Music Festival",
      "description": "An amazing music festival.",
      "location": { "lat": 40.7128, "lng": -74.0060, "address": "Central Park" },
      "date": "2023-12-31",
      "time": "18:00:00",
      "duration": "4 hours",
      "category": ["Music", "Festival"],
      "tags": ["live", "band"],
      "organizer": "City Events",
      "contact": "555-0123",
      "email": "info@cityevents.com",
      "ticketcount": 500,
      "is_active": true,
      "ticketoptions": { "VIP": 100, "General": 50 },
      "isFree": false,
      "ticketPrice": 50.00,
      "imageUrl": "https://example.com/event.jpg",
      "registrationUrl": "https://example.com/register",
      "recurrence": "Annual",
      "user_id": 1
    }
    ```

### Get Booking Details
Calculates price and returns user/event details for booking confirmation.

*   **URL:** `/api/events/booking-details`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "eventId": 1,
      "class": "gold",   // Optional: Ticket class (defaults to first available)
      "tickets": 2       // Optional: Number of tickets (defaults to 1)
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "user": { "userName": "...", "phone": "...", "email": "..." },
      "event": { "eventName": "...", "eventDate": "...", "ticketOptions": [...] },
      "booking": { "selectedClass": "gold", "ticketsCount": 2, "basePrice": "...", "charges": "...", "totalPrice": "..." }
    }
    ```

### Check Ticket Availability
Checks if the requested number of tickets are available for a specific class.

*   **URL:** `/api/events/check-availability`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "eventId": 1,
      "class": "gold",   // Optional: Defaults to first available option
      "tickets": 2       // Optional: Defaults to 1
    }
    ```
*   **Response:**
    *   `200 OK` (Available): `{ "success": true, "message": "Tickets available", "data": { ... } }`
    *   `200 OK` (Unavailable): `{ "success": false, "message": "Only X tickets available..." }`

### Get Order Details
Fetches confirmed order details including price breakdown and event info.
If the order is cancelled, it includes refund details.

*   **URL:** `/api/events/order-details`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "orderId": 15
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "orderId": 15,
      "status": "Confirmed",
      "customerName": "Sammed Patil",
      "ticketCount": 2,
      "totalPrice": 1250,
      "finalCost": 1350,
      "charges": 100,
      "event": {
        "title": "Sunburn Goa 2026",
        "category": "Music Festival",
        "date": "2026-12-28",
        "time": "04:00 PM",
        "duration": "6 Hours",
        "location": "Vagator Beach, Goa",
        "lat": 15.603,
        "lng": 73.743,
        "imageUrl": "https://..."
      },
      "refundDetails": {
        "refundId": "rfnd_...",
        "refundAmount": "1000.00",
        "deductionAmount": "250.00"
      }
    }
    ```

### Cancel Booking
Cancels a booking, restores ticket inventory, and initiates a refund based on the cancellation policy:
*   **< 24 Hours before event:** 50% deduction
*   **24-72 Hours before event:** 30% deduction
*   **> 72 Hours before event:** 10% deduction
*   **Event Started/Ended:** Cancellation not allowed

*   **URL:** `/api/events/cancel-booking`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "orderId": 15
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "message": "Booking cancelled successfully",
      "refundAmount": "1000.00",
      "deductionAmount": "250.00",
      "refundId": "rfnd_..."
    }
    ```

### Cancel Event (Admin)
Cancels an event, marks it as inactive, and initiates full refunds for all paid bookings.

*   **URL:** `/api/events/cancel/:id`
*   **Method:** `POST`
*   **Response:**
    ```json
    {
      "success": true,
      "message": "Event cancelled and refunds processed",
      "summary": {
        "totalBookings": 5,
        "refunded": 5,
        "failed": 0,
        "errors": []
      }
    }
    ```

### Get All Events
*   **URL:** `/api/events`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>` (Optional - to fetch booked events)
*   **Response:**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "title": "Music Festival",
          "is_active": true
        }
      ],
      "bookedEvents": [
        {
          "id": 5,
          "title": "My Upcoming Concert"
        }
      ]
    }
    ```

### Get Event by ID
*   **URL:** `/api/events/:id`
*   **Method:** `GET`

### Update Event
*   **URL:** `/api/events/:id`
*   **Method:** `PUT`
*   **Body:** Event fields to update.

### Delete Event
*   **URL:** `/api/events/:id`
*   **Method:** `DELETE`

---

## Payments

### Create Payment Order
Creates a Razorpay order and an internal booking record.

*   **URL:** `/api/payment/create-order`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "eventId": 1,
      "tickets": 2,
      "class": "gold"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "internal_order_id": 15,
      "razorpay_order_id": "order_MzL8...",
      "amount": 53500,
      "currency": "INR"
    }
    ```

### Verify Payment Status
Checks the status of a booking. If pending, it queries Razorpay to see if payment was captured.

*   **URL:** `/api/payment/verify-status`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "orderId": 15
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "status": "paid",
      "booking": { ... }
    }
    ```

---

## History

### Get Order History
Fetches the order history (excluding pending and failed orders) for the logged-in user.

*   **URL:** `/api/history`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "type": "event" // or "all"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 55,
          "type": "event",
          "title": "New year event 2026",
          "created_at": "2026-01-11T15:04:11.256604+05:30",
          "status": "paid",
          "finalCost": "100.00",
          "user": 3
        }
      ]
    }
    ```

---

## Notifications

### Send Broadcast Notification
Sends a push notification to all users with a valid FCM token.

*   **URL:** `/api/notifications/send-all`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Big Sale!",
      "body": "50% off on all events.",
      "imageUrl": "https://example.com/image.jpg",
      "data": { "screen": "home" }
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "message": "Notification process completed. Sent to 150 devices.",
      "stats": { "total": 150, "success": 145, "failure": 5 }
    }
    ```

---

## Rides & Riders

### Create Ride (User)
*   **URL:** `/api/ride/create`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "token": "jwt_token",
      "trip_details": { "origin": "...", "drop": "..." },
      "service_details": { ... }
    }
    ```

### Get All Rides
*   **URL:** `/api/ride`
*   **Method:** `GET`

### Create Rider (Registration)
*   **URL:** `/api/rider/create`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "name": "Rider Name",
      "role": "rider",
      "password": "securepassword",
      "contact": "9876543210",
      "current_location": { "lat": 12.34, "lng": 56.78 },
      "vehicle_number": "AB-12-CD-3456",
      "vehicle_type": "bike",
      "fuel_type": "petrol",
      "vehicle_model": "Model X",
      "join_date": "2023-01-01"
    }
    ```

### Login Rider
*   **URL:** `/api/rider/login`
*   **Method:** `POST`
*   **Body:** Credentials (implementation specific, likely phone/password).

### Verify Rider Documents (Admin/Manager)
*   **URL:** `/api/rider/verify`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "token": "admin_jwt_token",
      "riderId": "uuid",
      "is_verified": true,
      "message": "Documents approved"
    }
    ```

---

## Socket.IO Events

### Client -> Server

*   **`syncRider`**: Updates rider socket ID.
    *   Payload: `{ "riderId": "uuid" }`
*   **`changeRiderStatus`**: Updates rider online/offline status.
    *   Payload: `{ "riderId": "uuid", "status": "online" }`
*   **`createRide`**: Creates a ride request via socket.
    *   Payload: `{ "token": "...", "trip_details": ..., "service_details": ... }`
*   **`ride:accept`**: Rider accepts a ride.
    *   Payload: `{ "riderId": "...", "rideId": "..." }`
*   **`ride:reject`**: Rider rejects a ride.
    *   Payload: `{ "riderId": "...", "rideId": "..." }`
*   **`cancelRide`**: User cancels a ride.
    *   Payload: `{ "token": "...", "id": "ride_id" }`

### Server -> Client

*   **`welcome`**: Sent on connection.
*   **`riderUpdate`**: Sent when rider status or socket is updated.
*   **`rideUpdate`**: Sent when ride status changes (created, assigned, cancelled).
*   **`ride:request`**: Sent to specific rider to offer a ride.
    *   Payload: `{ "rideId": "...", "origin": "...", "destination": "..." }`
*   **`ride:confirmed`**: Sent to rider when assignment is confirmed.
*   **`rider:accepted`**: Broadcasted when a rider accepts.
*   **`rider:rejected`**: Broadcasted when a rider rejects.
