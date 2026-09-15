export type GeoPoint = {
  latitude: number
  longitude: number
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

export function calculateDistanceKm(
  origin: GeoPoint,
  destination: GeoPoint,
): number {
  const earthRadiusKm = 6371

  const latitudeDifference = toRadians(
    destination.latitude - origin.latitude,
  )

  const longitudeDifference = toRadians(
    destination.longitude - origin.longitude,
  )

  const originLatitude = toRadians(origin.latitude)
  const destinationLatitude = toRadians(destination.latitude)

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDifference / 2) ** 2

  const centralAngle =
    2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * centralAngle
}

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error('Distance must be a finite non-negative number')
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`
  }

  return `${Math.round(distanceKm)} km`
}

export function createNavigationUrl(
  destination: GeoPoint,
): string {
  const { latitude, longitude } = destination

  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}
