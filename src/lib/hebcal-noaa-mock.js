export class GeoLocation {
  constructor(name, latitude, longitude, elevation, timeZoneId) {
    this.locationName = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.elevation = elevation;
    this.timeZoneId = timeZoneId;
  }
  setLocationName(name) { this.locationName = name; }
  setLatitude(latitude) { this.latitude = latitude; }
  setLongitude(longitude) { this.longitude = longitude; }
  setElevation(elevation) { this.elevation = elevation; }
  setTimeZone(timeZoneId) { this.timeZoneId = timeZoneId; }
  getLocationName() { return this.locationName; }
  getLatitude() { return this.latitude; }
  getLongitude() { return this.longitude; }
  getTimeZone() { return this.timeZoneId; }
}
export class NOAACalculator {}
