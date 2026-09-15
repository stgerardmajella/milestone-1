import { describe, expect, it } from 'vitest'
import {
  calculateDistanceKm,
  createNavigationUrl,
  formatDistanceKm,
} from './index'

describe('geolocation', () => {
  it('returns zero for identical coordinates', () => {
    const point = {
      latitude: -33.9249,
      longitude: 18.4241,
    }

    expect(calculateDistanceKm(point, point)).toBe(0)
  })

  it('calculates the approximate distance between Cape Town and Stellenbosch', () => {
    const capeTown = {
      latitude: -33.9249,
      longitude: 18.4241,
    }

    const stellenbosch = {
      latitude: -33.9321,
      longitude: 18.8602,
    }

    const distance = calculateDistanceKm(
      capeTown,
      stellenbosch,
    )

    expect(distance).toBeGreaterThan(39)
    expect(distance).toBeLessThan(42)
  })

  it('formats distances below one kilometre as metres', () => {
    expect(formatDistanceKm(0.8)).toBe('800 m')
  })

  it('formats distances below ten kilometres with one decimal place', () => {
    expect(formatDistanceKm(3.4)).toBe('3.4 km')
  })

  it('formats larger distances as whole kilometres', () => {
    expect(formatDistanceKm(12.6)).toBe('13 km')
  })

  it('rejects invalid distances', () => {
    expect(() => formatDistanceKm(-1)).toThrow()
    expect(() => formatDistanceKm(Number.NaN)).toThrow()
  })

  it('creates a navigation URL from destination coordinates', () => {
    const url = createNavigationUrl({
      latitude: -33.9249,
      longitude: 18.4241,
    })

    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-33.9249,18.4241',
    )
  })
})
