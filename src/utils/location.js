// Authorized locations - can be moved to database later
let authorizedLocations = [
  { latitude: 37.7749, longitude: -122.4194, name: 'San Francisco Office' },
  { latitude: 31.771959, longitude: 35.217018, name: 'Jerusalem Office' },
];

const LOCATION_THRESHOLD = 0.01; // ~1km radius

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

const isAuthorizedLocation = (latitude, longitude) => {
  return authorizedLocations.some((location) => {
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      latitude,
      longitude
    );
    return distance < LOCATION_THRESHOLD;
  });
};

const getAuthorizedLocations = () => authorizedLocations;

const addAuthorizedLocation = (latitude, longitude, name = '') => {
  authorizedLocations.push({ latitude, longitude, name });
  return authorizedLocations;
};

const removeAuthorizedLocation = (index) => {
  if (index >= 0 && index < authorizedLocations.length) {
    authorizedLocations.splice(index, 1);
    return true;
  }
  return false;
};

module.exports = {
  isAuthorizedLocation,
  getAuthorizedLocations,
  addAuthorizedLocation,
  removeAuthorizedLocation,
};
