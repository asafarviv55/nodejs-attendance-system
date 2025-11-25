const {
  getAuthorizedLocations,
  addAuthorizedLocation,
  removeAuthorizedLocation,
} = require('../utils/location');

const getLocations = (req, res) => {
  res.json({ success: true, locations: getAuthorizedLocations() });
};

const addLocation = (req, res) => {
  const { latitude, longitude, name } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
  }

  addAuthorizedLocation(latitude, longitude, name);
  res.json({ success: true, message: 'Location added successfully' });
};

const deleteLocation = (req, res) => {
  const index = parseInt(req.params.index, 10);

  if (removeAuthorizedLocation(index)) {
    res.json({ success: true, message: 'Location deleted successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid location index' });
  }
};

module.exports = { getLocations, addLocation, deleteLocation };
