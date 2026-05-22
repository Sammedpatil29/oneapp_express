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

### Get All Users
Fetches a list of all registered users.

*   **URL:** `/users`
*   **Method:** `GET`
*   **Response:**
    *   `200 OK`:
        ```json
        {
          "success": true,
          "count": 1,
          "data": [
            {
              ...
            }
          ]
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

### Query Specific Metadata Fields
Fetches specific fields (like categories, status, polygon) from the metadata based on the body provided.

*   **URL:** `/api/metadata/query`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "fields": ["categories", "status"]
    }
    ```

### Get All Metadata
Fetches all metadata including the service area polygon, service cities, statuses, and categories.

*   **URL:** `/api/metadata`
*   **Method:** `GET`

### Update Metadata
Updates specific fields of the metadata.

*   **URL:** `/api/metadata`
*   **Method:** `PATCH`
*   **Body:**
    ```json
    {
      "categories": ["grocery", "dineout", "events"],
      "status": ["active", "inactive"],
      "locations": ["City A", "City B"],
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

#### Get All Items
*   **URL:** `/api/grocery`
*   **Method:** `GET`
*   **Query Params:** `category`, `active`, `brand`, `featured`

#### Get Item Details
*   **URL:** `/api/grocery/:id`
*   **Method:** `GET`

#### Create Item
*   **URL:** `/api/grocery`
*   **Method:** `POST`
*   **Body:**
    ```json
    { "name": "Apple", "price": 100, "stock": 50, "unit": "kg", "unit_value": 1, "category": "fruits" }
    ```

#### Update Item
*   **URL:** `/api/grocery/:id`
*   **Method:** `PUT`
*   **Body:** Fields to update.

#### Delete Item
*   **URL:** `/api/grocery/:id`
*   **Method:** `DELETE`

### 2. Grocery Categories

#### Get All Categories
*   **URL:** `/api/grocery-categories`
*   **Method:** `GET`

#### Create Category
*   **URL:** `/api/grocery-categories`
*   **Method:** `POST`
*   **Body:**
    ```json
    { "name": "Fruits", "img": "url", "bg": "#ffffff" }
    ```

### 3. Grocery Cart

#### Get User Cart
Fetches cart items, bill details, and suggestions.

*   **URL:** `/api/grocery/cart`
*   **Method:** `GET`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Query Params:** `coupon` (Optional)
*   **Response:**
    ```json
    {
      "success": true,
      "data": {
        "items": [ ... ],
        "billDetails": {
          "mrpTotal": "200.00",
          "itemTotal": "180.00",
          "deliveryFee": "30.00",
          "toPay": "210.00",
          "totalSavings": "20.00"
        },
        "suggestions": [ ... ]
      }
    }
    ```

#### Update Cart Item
Adds or updates an item in the cart. Setting quantity to 0 removes it.

*   **URL:** `/api/grocery/cart`
*   **Method:** `POST`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`
*   **Body:**
    ```json
    {
      "productId": 1,
      "quantity": 2
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "message": "Cart updated",
      "data": [{ "1": 2 }],
      "itemCount": 2,
      "totalPrice": "180.00"
    }
    ```

#### Remove Item from Cart
*   **URL:** `/api/grocery/cart/:productId`
*   **Method:** `DELETE`
*   **Headers:**
    *   `Authorization`: `Bearer <token>`

### 4. Grocery Home

#### Get Home Data
*   **URL:** `/api/grocery-home`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <token>` (Optional)

#### Get Products by Category
*   **URL:** `/api/grocery-home/productbycategory`
*   **Method:** `POST`
*   **Body:** `{ "selectedCategory": "fruits" }`

#### Search Items
*   **URL:** `/api/grocery-home/search`
*   **Method:** `POST`
*   **Body:** `{ "searchTerm": "apple" }`

### 5. Grocery Orders

#### Create Order
*   **URL:** `/api/grocery-order/create`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "cartItems": [ ... ],
      "billDetails": { "toPay": 150, ... },
      "address": { ... },
      "paymentDetails": { "mode": "online" },
      "riderDetails": { ... }
    }
    ```

#### Verify Payment
*   **URL:** `/api/grocery-order/verify-payment`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 123 }`

#### Get Orders List
*   **URL:** `/api/grocery-order/list`
*   **Method:** `GET`
*   **Headers:** `Authorization: Bearer <token>`

#### Cancel Order
*   **URL:** `/api/grocery-order/cancel`
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

### Dineout Orders & Payments

#### Create Order
*   **URL:** `/api/dineout/orders/create`
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
*   **Response:**
    ```json
    {
      "success": true,
      "message": "Order placed successfully",
      "data": { ... }
    }
    ```

#### Get Order Details
*   **URL:** `/api/dineout/orders/details`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 1 }`
*   **Response:**
    ```json
    {
      "success": true,
      "data": {
        "id": 1,
        "status": "CONFIRMED",
        "bill_details": { ... },
        "info": { "message": "Booking Confirmed!", ... }
      }
    }
    ```

#### Cancel Order
*   **URL:** `/api/dineout/orders/cancel`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:** `{ "orderId": 1 }`

#### Upload Bill
*   **URL:** `/api/dineout/orders/upload-bill`
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
*   **URL:** `/api/dineout/orders/verify-bill`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "bookingId": 1,
      "status": "verified", // or "rejected"
      "billAmount": 1500
    }
    ```

#### Calculate Bill Offers
Calculates the best offer and savings for a given bill amount.

*   **URL:** `/api/dineout/orders/calculate-bill`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "restaurantId": 1,
      "billAmount": 2000,
      "bookingId": 5 // Optional
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "data": {
        "originalAmount": 2000,
        "maxSavings": 200,
        "finalAmount": 1800,
        "bestOffer": { ... },
        "eligibleOffers": [ ... ]
      }
    }
    ```

#### Create Dineout Payment
Creates a Razorpay order for a dineout bill.

*   **URL:** `/api/dineout/orders/payment/create`
*   **Method:** `POST`
*   **Headers:** `Authorization: Bearer <token>`
*   **Body:**
    ```json
    {
      "billAmount": 1500,
      "restaurantId": 1,
      "bookingId": 5,
      "discount": 100
    }
    ```

#### Verify Dineout Payment
Verifies payment status with Razorpay and updates the order.

*   **URL:** `/api/dineout/orders/payment/verify`
*   **Method:** `POST`
*   **Body:** `{ "orderId": 5 }`
*   **Response:**
    ```json
    {
      "success": true,
      "status": "paid",
      "order": { ... }
    }
    ```

---

## Sidebar Items

### Create Sidebar Item
*   **URL:** `/api/sidebar-items/create`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "title": "Home",
      "routerLink": ["/layout/home"],
      "routerLinkActiveOptions": { "exact": true },
      "svg": "M240...",
      "requiredRole": ["admin"],
      "notification": false,
      "is_active": true
    }
    ```

### Seed Sidebar Items
Bulk insert multiple sidebar items at once.
*   **URL:** `/api/sidebar-items/seed`
*   **Method:** `POST`
*   **Body:**
    ```json
    [
      {
        "routerLink": ["/layout/home"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Home",
        "svg": "M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"
      },
      {
        "routerLink": ["/layout/inventory"],
        "title": "Inventory",
        "svg": "M120-40v-880h80v80h560v-80h80v880h-80v-80H200v80h-80Zm80-480h80v-160h240v160h240v-240H200v240Zm0 320h240v-160h240v160h80v-240H200v240Zm160-320h80v-80h-80v80Zm160 320h80v-80h-80v80ZM360-520h80-80Zm160 320h80-80Z",
        "requiredRole": ["admin"],
        "notification": true
      },
      {
        "routerLink": ["/layout/orders-layout"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Orders",
        "svg": "M160-160v-516L82-846l72-34 94 202h464l94-202 72 34-78 170v516H160Zm240-280h160q17 0 28.5-11.5T600-480q0-17-11.5-28.5T560-520H400q-17 0-28.5 11.5T360-480q0 17 11.5 28.5T400-440ZM240-240h480v-358H240v358Zm0 0v-358 358Z",
        "notification": true
      },
      {
        "routerLink": ["/layout/suggestions"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Manage Tickets",
        "svg": "M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480q0-17-11.5-28.5T480-520q-17 0-28.5 11.5T440-480q0 17 11.5 28.5T480-440Zm0-160q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm320 440H160q-33 0-56.5-23.5T80-240v-160q33 0 56.5-23.5T160-480q0-33-23.5-56.5T80-560v-160q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v160q-33 0-56.5 23.5T800-480q0 33 23.5 56.5T880-400v160q0 33-23.5 56.5T800-160Zm0-80v-102q-37-22-58.5-58.5T720-480q0-43 21.5-79.5T800-618v-102H160v102q37 22 58.5 58.5T240-480q0 43-21.5 79.5T160-342v102h640ZM480-480Z",
        "notification": true
      },
      {
        "routerLink": ["/layout/notifications"],
        "title": "Notifications",
        "svg": "M480-500Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80Zm240-360v-120H600v-80h120v-120h80v120h120v80H800v120h-80ZM160-200v-80h80v-280q0-83 50-147.5T420-792v-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v28q14 4 27.5 8.5T593-772q-15 14-27 30.5T545-706q-15-7-31.5-10.5T480-720q-66 0-113 47t-47 113v280h320v-112q18 11 38 18t42 11v83h80v80H160Z",
        "requiredRole": ["admin"]
      },
      {
        "routerLink": ["/layout/metadata"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Meta Data",
        "svg": "M480-120q-151 0-255.5-46.5T120-280v-400q0-66 105.5-113T480-840q149 0 254.5 47T840-680v400q0 67-104.5 113.5T480-120Zm0-479q89 0 179-25.5T760-679q-11-29-100.5-55T480-760q-91 0-178.5 25.5T200-679q14 30 101.5 55T480-599Zm0 199q42 0 81-4t74.5-11.5q35.5-7.5 67-18.5t57.5-25v-120q-26 14-57.5 25t-67 18.5Q600-528 561-524t-81 4q-42 0-82-4t-75.5-11.5Q287-543 256-554t-56-25v120q25 14 56 25t66.5 18.5Q358-408 398-404t82 4Zm0 200q46 0 93.5-7t87.5-18.5q40-11.5 67-26t32-29.5v-98q-26 14-57.5 25t-67 18.5Q600-328 561-324t-81 4q-42 0-82-4t-75.5-11.5Q287-343 256-354t-56-25v99q5 15 31.5 29t66.5 25.5q40 11.5 88 18.5t94 7Z"
      },
      {
        "routerLink": ["/layout/validation"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Validation",
        "svg": "M481-779.67q107.33 0 202.33 45.84 95 45.83 158 131.83 4.34 6.33 3.17 10.67-1.17 4.33-5.17 8-4 3.66-9.66 3.5Q824-580 819.33-586q-57.66-80.67-147.5-123.83Q582-753 481-753q-101 0-189.33 43.5-88.34 43.5-147 123.5-4.67 6.33-9.67 7.33t-9.67-2q-5-3-5.5-8.5t2.84-10.83q62-85.67 156.5-132.67 94.5-47 201.83-47Zm0 95.34q135.67 0 233 90 97.33 90 97.33 222.33 0 47.33-34.5 79.83t-83.5 32.5q-49.66 0-85.16-32.5T572.67-372q0-37-27.17-61.83-27.17-24.84-64.5-24.84t-64.83 24.84Q388.67-409 388.67-372q0 101.67 61.16 169.67Q511-134.33 604-107q7 2.33 9 6.67 2 4.33.67 9.66-1.34 5.67-5.34 8.67T598-81q-103.33-26-169.67-103.17Q362-261.33 362-372q0-48 35-80.67 35-32.66 84-32.66t84 32.66Q600-420 600-372q0 36.33 28 61.17Q656-286 693.33-286 730-286 757-310.83q27-24.84 27-61.17 0-120.67-89.33-202.33Q605.33-656 481.33-656T268-574.33q-89.33 81.66-89.33 202 0 24 5.16 61.66Q189-273 206.67-224.33 209-218 206.5-214t-7.17 6.33q-5.33 2.34-10.83.5-5.5-1.83-7.83-7.83-13.67-38.33-20.84-77.5-7.16-39.17-7.16-79.5 0-130.33 97.5-221.33t230.83-91Zm0-195.34q64.67 0 126.67 15.84 62 15.83 119 44.83 6.33 3 7.16 8 .84 5-1.5 9.33-2.33 4.34-7 7Q720.67-792 714-795q-54.33-27-113.17-42.17Q542-852.33 481-852.33q-60.67 0-118.67 14.16-58 14.17-111 43.17-6 3-10.33 1.17-4.33-1.84-7-6.5-2.67-4-2-8.84.67-4.83 5.33-7.83Q294-847.67 356-863.67t125-16Zm0 295q92.33 0 159 61.5T706.67-372q0 6.33-3.5 9.83t-9.84 3.5q-6 0-10-3.5t-4-9.83q0-79-58.83-132.5T481-558q-80.67 0-138.5 53.5T284.67-372q0 83.67 29 142.5t85.66 117.83Q404-107 403.67-102q-.34 5-4.34 9-3.33 3.33-9 4.33-5.66 1-10.33-4.33-58.33-60.67-90.5-126.17T257.33-372q0-89.67 65.67-151.17 65.67-61.5 158-61.5ZM480-386q6.33 0 9.83 4t3.5 10q0 79 57.67 130t133.67 51q7.33 0 18.33-1 11-1 23.67-3 6.33-1.33 10.5 1.83 4.16 3.17 5.5 8.17 1.33 5.33-1.34 9.33-2.66 4-8.66 5.34-18 5-31.5 5.5t-16.5.5q-88.34 0-153.17-59-64.83-59-64.83-148.67 0-6 3.5-10t9.83-4Z",
        "notification": true
      },
      {
        "routerLink": ["/layout/manageUsers"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Manage Users",
        "svg": "M680-280q25 0 42.5-17.5T740-340q0-25-17.5-42.5T680-400q-25 0-42.5 17.5T620-340q0 25 17.5 42.5T680-280Zm0 120q31 0 57-14.5t42-38.5q-22-13-47-20t-52-7q-27 0-52 7t-47 20q16 24 42 38.5t57 14.5ZM480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v227q-19-8-39-14.5t-41-9.5v-147l-240-90-240 90v188q0 47 12.5 94t35 89.5Q310-290 342-254t71 60q11 32 29 61t41 52q-1 0-1.5.5t-1.5.5Zm200 0q-83 0-141.5-58.5T480-280q0-83 58.5-141.5T680-480q83 0 141.5 58.5T880-280q0 83-58.5 141.5T680-80ZM480-494Z",
        "requiredRole": ["admin"]
      },
      {
        "routerLink": ["/layout/settings"],
        "routerLinkActiveOptions": { "exact": true },
        "title": "Settings",
        "svg": "m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"
      }
    ]
    ```

### Get All Sidebar Items
Fetches all sidebar items. Can be filtered by active status and role.
*   **URL:** `/api/sidebar-items`
*   **Method:** `GET`
*   **Query Params:**
    *   `active`: `true` | `false` (Optional)
    *   `role`: e.g., `admin` (Optional - returns items requiring this role OR items requiring no role)

### Get Sidebar Item by ID
*   **URL:** `/api/sidebar-items/:id`
*   **Method:** `GET`

### Update Sidebar Item
*   **URL:** `/api/sidebar-items/:id`
*   **Method:** `PUT`
*   **Body:** Sidebar item fields to update.

### Delete Sidebar Item
*   **URL:** `/api/sidebar-items/:id`
*   **Method:** `DELETE`
