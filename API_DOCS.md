# API Documentation

Base URL: `http://localhost:3000` (Default)

## Authentication (User)

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

### Get User Profile
Fetches the logged-in user's profile.

*   **URL:** `/user`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`

### Update User Profile
Updates user profile details.

*   **URL:** `/user`
*   **Method:** `PATCH`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    }
    ```

## Admin Authentication

### Create Admin
Creates a new admin user.

*   **URL:** `/api/admin/create`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "email": "admin@example.com",
      "password": "securepassword",
      "first_name": "Admin",
      "last_name": "User",
      "phone": "9876543210",
      "role": "admin"
    }
    ```

### Login Admin
*   **URL:** `/api/admin/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "phone": "9876543210",
      "password": "securepassword"
    }
    ```

### Get Admin Profile
Fetches the currently logged-in admin's profile.

*   **URL:** `/api/admin/profile`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`

### Get All Admins
Fetches a list of all admin users.

*   **URL:** `/api/admin/list`
*   **Method:** `GET`

### Update Admin
Updates an existing admin user.

*   **URL:** `/api/admin/:id`
*   **Method:** `PUT`
*   **Body:**
    ```json
    {
      "email": "newemail@example.com",
      "first_name": "Updated",
      "last_name": "Name",
      "phone": "9876543210",
      "role": "manager",
      "is_active": true
    }
    ```

### Delete Admin
Deletes an admin user.

*   **URL:** `/api/admin/:id`
*   **Method:** `DELETE`

## Admin Order Management

### Get All Orders
Fetches orders based on service type.

*   **URL:** `/api/admin/orders`
*   **Method:** `GET`
*   **Query Params:**
    *   `service`: `grocery` | `dineout` | `event` | `ride` (Required)
    *   `status`: Filter by status (Optional)
*   **Response:**
    ```json
    {
      "success": true,
      "count": 5,
      "data": [ ... ]
    }
    ```

### Update Order Status
Updates the status of a specific order.

*   **URL:** `/api/admin/orders`
*   **Method:** `PATCH`
*   **Body:**
    ```json
    {
      "service": "grocery",
      "orderId": 1,
      "status": "CONFIRMED"
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

## Metadata (Configuration)

### Get Polygon
Fetches the service area polygon.

*   **URL:** `/api/metadata`
*   **Method:** `GET`

### Update Polygon
Updates the service area polygon.

*   **URL:** `/api/metadata`
*   **Method:** `PATCH`
*   **Body:**
    ```json
    {
      "polygon": [
        { "lat": 12.9716, "lng": 77.5946 },
        { "lat": 12.9717, "lng": 77.5947 },
        { "lat": 12.9718, "lng": 77.5948 }
      ]
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

### Get Ride Estimates
Calculates price, estimated duration, and arrival time for different vehicle types between two locations.

*   **URL:** `/api/ride/estimate`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "origin": {
        "coords": {
          "lat": 12.9716,
          "lng": 77.5946
        }
      },
      "drop": {
        "coords": {
          "lat": 12.2958,
          "lng": 76.6394
        }
      }
    }
    ```
*   **Response:**
    ```json
    [
      {
        "type": "bike",
        "image_url": "assets/icon/...",
        "max_person": "max 1 person",
        "estimated_time": "15 mins",
        "estimated_reach_time": "4:30 pm",
        "price": 45
      },
      {
        "type": "cab",
        "image_url": "assets/icon/...",
        "max_person": "max 4 persons",
        "estimated_time": "15 mins",
        "estimated_reach_time": "4:30 pm",
        "price": 120
      }
    ]
    ```

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

### Rider Cancel Ride
Allows a rider to cancel/unassign themselves from a ride.

*   **URL:** `/api/ride/rider-cancel`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "rideId": 1,
      "riderId": "uuid"
    }
    ```

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

*   **`syncRider`**: Updates rider socket ID and sets status to 'online'.
    *   Payload: `{ "riderId": "uuid" }`
*   **`ride:accept`**: Rider accepts a ride.
    *   Payload: `{ "riderId": "...", "rideId": "..." }`
*   **`cancelRide`**: User cancels a ride.
    *   Payload: `{ "rideId": "ride_id" }`

### Server -> Client

*   **`rideUpdate`**: Broadcasted when ride status changes (accepted, cancelled).
    *   Payload: Full ride object OR `{ "id": "...", "status": "cancelled" }`
*   **`ride:request`**: Sent to specific rider to offer a ride.
    *   Payload:
        ```json
        {
          "rideId": "...",
          "trip_details": { ... },
          "service_details": { ... },
          "fare": 100
        }
        ```
*   **`ride:confirmed`**: Sent to rider when assignment is confirmed.
    *   Payload: `{ "success": true, "ride": { ... } }`
*   **`ride:error`**: Sent to a rider if acceptance fails (e.g., already taken).
    *   Payload: `{ "message": "Ride already taken or cancelled" }`

---

## Grocery Module

### 1. Grocery Items
**Base URL:** `/api/grocery`

| Method | Endpoint | Description | Auth | Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Get all items | No | Query: `category`, `active`, `brand`, `featured` |
| `GET` | `/:id` | Get item details | No | Param: `id` |
| `POST` | `/` | Create item | Yes* | `{ name, price, stock, unit, unit_value, category, tags, sku, brand, ... }` |
| `POST` | `/bulk` | Bulk create items | Yes* | `[ { name, ... }, ... ]` |
| `PUT` | `/:id` | Update item | Yes* | Fields to update |
| `DELETE` | `/:id` | Delete item | Yes* | Param: `id` |

*\*Auth middleware is optional/commented out in routes.*

### 2. Grocery Categories
**Base URL:** `/api/grocery-categories`

| Method | Endpoint | Description | Auth | Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Get all categories | No | - |
| `POST` | `/` | Create category | No | `{ name, img, bg }` |
| `POST` | `/seed` | Bulk create | No | `[ { name, img, bg }, ... ]` |
| `POST` | `/seed` | Bulk create | No | `[ { name, img, bg }, ... ]` (Optional: uses default list if empty) |
| `PUT` | `/:id` | Update category | No | Fields to update |
| `DELETE` | `/:id` | Delete category | No | Param: `id` |

### 3. Grocery Cart
**Base URL:** `/api/grocery/cart`

| Method | Endpoint | Description | Auth | Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Get user cart | **Yes** | - |
| `POST` | `/update` | Add/Update item | **Yes** | `{ productId, quantity }` <br> Sets quantity directly. If 0, removes item. |
| `DELETE` | `/:productId` | Remove item | **Yes** | Param: `productId` |

### 4. Grocery Home
**Base URL:** `/api/grocery-home`

| Method | Endpoint | Description | Auth | Body / Params |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | Get home data (categories, banners, cart) | Optional | Header: `Authorization: Bearer <token>` to get cart items. |
| `POST` | `/category` | Get category page data | Optional | `{ "selectedRoute": "string" }` |
| `POST` | `/productbycategory` | Get products by category | Optional | `{ "selectedCategory": "string" }` |
| `POST` | `/section` | Get dynamic section data | No | `{ "term": "under_100" \| "trending" \| "new_arrivals" }` |
| `POST` | `/search` | Search items | Optional | `{ "searchTerm": "apple" }` (Header: Auth optional for cart sync) |

### 5. Grocery Orders
**Base URL:** `/api/grocery-order`

#### Create Order
*   **URL:** `/create`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "cartItems": [ ... ],
      "billDetails": { "toPay": 150, ... },
      "address": { ... },
      "paymentDetails": { "mode": "online" },
      "riderDetails": { ... },
      "status": "PENDING" // Optional
    }
    ```

#### Verify Payment
*   **URL:** `/verify-payment`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 123 }`

#### Get Orders List
*   **URL:** `/list`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <token>`

#### Cancel Order
*   **URL:** `/cancel`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "orderId": 123 }`

---

## Dineout

### Create Restaurant
*   **URL:** `/api/dineout`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "name": "Restaurant Name",
      "image": "url",
      "location": "Area, City",
      "distance": "5 km",
      "price": "₹1200 for two",
      "rating": 4.5,
      "coords": { "lat": 12.9, "lng": 77.6 },
      "amenities": [{ "name": "Wifi", "icon": "wifi" }],
      "openingHours": [{ "day": "Monday", "slots": ["10am-10pm"] }],
      "menuItems": [],
      "offers": []
    }
    ```

### Get All Restaurants
*   **URL:** `/api/dineout`
*   **Method:** `GET`
*   **Query Params:**
    *   `city`: Filter by city name
    *   `search`: Search by name, tags, or location
    *   `veg`: `true` for veg-only

### Get Restaurant by ID
*   **URL:** `/api/dineout/:id`
*   **Method:** `GET`

### Update Restaurant
*   **URL:** `/api/dineout/:id`
*   **Method:** `PUT`
*   **Body:** Fields to update.

### Delete Restaurant
*   **URL:** `/api/dineout/:id`
*   **Method:** `DELETE`

### Seed Restaurants
*   **URL:** `/api/dineout/seed`
*   **Method:** `POST`
*   **Body:** Array of restaurant objects.

### Dineout Orders
**Base URL:** `/api/dineout/orders`

#### Create Order
*   **URL:** `/create`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "restaurantId": 1,
      "restaurantName": "Tasty Bites",
      "guestCount": 2,
      "date": "2023-12-25",
      "timeSlot": "19:00",
      "offerApplied": { ... },
      "billDetails": { ... }
    }
    ```

#### Get Order Details
*   **URL:** `/details`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 1 }`

#### Cancel Order
*   **URL:** `/cancel`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "orderId": 1 }`

#### Upload Bill
*   **URL:** `/upload-bill`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "bookingId": 1,
      "image": { "base64String": "...", "format": "jpg" }
    }
    ```

#### Verify Bill (Admin/Manager)
*   **URL:** `/verify-bill`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "bookingId": 1, "status": "verified", "billAmount": 1500 }`

#### Calculate Bill Offers
Calculates the best offer and savings for a given bill amount.

*   **URL:** `/calculate-bill`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "restaurantId": 1, "billAmount": 2000 }`

#### Create Dineout Payment
Creates a Razorpay order for a dineout bill.

*   **URL:** `/payment/create`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "billAmount": 1500, "restaurantId": 1, "bookingId": 5, "discount": 100 }`

#### Verify Dineout Payment
Verifies payment status with Razorpay and updates the order.

*   **URL:** `/payment/verify`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 5 }`
