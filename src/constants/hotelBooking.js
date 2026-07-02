/**
 * Hotel Booking allowed label values — shared by the Mongoose model and the
 * Joi validator. Values are the exact human-readable labels sent by the client.
 */

const HOTEL_PROPERTY_TYPES = Object.freeze([
  'Hotel',
  'Resort',
  'Villa',
  'Cottage',
  'Homestay',
  'Camp',
  'Houseboat',
]);

const HOTEL_CATEGORIES = Object.freeze(['3 Star', '4 Star', '5 Star']);

const HOTEL_ROOM_VIEWS = Object.freeze([
  'Garden View',
  'Sea View',
  'City View',
  'Pool View',
  'River View',
]);

const HOTEL_AMENITIES = Object.freeze([
  'Swimming Pool',
  'Wifi',
  'Spa',
  'Restaurant',
  'Parking',
  'Bonfire',
  'Bar',
  'Balcony Terrace',
  'Kitchen',
  'Caretaker',
  'Lift',
]);

const HOTEL_MEAL_PLANS = Object.freeze([
  'Continental Plan',
  'Only Breakfast',
  'Breakfast & Dinner',
  'All Meal',
]);

const HOTEL_TRANSFERS = Object.freeze([
  'Airport Transfers',
  'Railway Station Transfer',
  'Sight Seeing Transfers',
]);

/** typeOfBooking discriminator values that drive sub-object branching */
const BOOKING_TYPE = Object.freeze({
  FLIGHT: 'Flight Booking',
  HOTEL: 'Hotel Booking',
});

module.exports = {
  HOTEL_PROPERTY_TYPES,
  HOTEL_CATEGORIES,
  HOTEL_ROOM_VIEWS,
  HOTEL_AMENITIES,
  HOTEL_MEAL_PLANS,
  HOTEL_TRANSFERS,
  BOOKING_TYPE,
};
