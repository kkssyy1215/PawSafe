import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';

const SAVED_PLACES_STORAGE_KEY = 'pawsafe.saved-places.v1';
const MAX_SAVED_PLACES = 5;

export interface SavedPlace extends PlaceSearchResult {
  label: string;
}

interface SavedPlaceRecord {
  id: string;
  label: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  is_in_coverage: boolean;
}

function isSavedPlaceRecord(value: unknown): value is SavedPlaceRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<SavedPlaceRecord>;
  return typeof record.id === 'string'
    && typeof record.label === 'string'
    && typeof record.name === 'string'
    && typeof record.address === 'string'
    && typeof record.lat === 'number'
    && typeof record.lng === 'number'
    && typeof record.is_in_coverage === 'boolean';
}

function recordToSavedPlace(record: SavedPlaceRecord): SavedPlace {
  return {
    id: record.id,
    label: record.label,
    name: record.label,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    is_in_coverage: record.is_in_coverage,
  };
}

function placeToRecord(place: PlaceSearchResult, label: string): SavedPlaceRecord {
  return {
    id: place.id,
    label,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    is_in_coverage: place.is_in_coverage,
  };
}

export function savedPlaceToSearchResult(place: SavedPlace): PlaceSearchResult {
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    is_in_coverage: place.is_in_coverage,
  };
}

export function useSavedPlaces() {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_PLACES_STORAGE_KEY);
        if (!raw || !mounted) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const places = parsed.filter(isSavedPlaceRecord).slice(0, MAX_SAVED_PLACES).map(recordToSavedPlace);
        if (mounted) setSavedPlaces(places);
      } catch {
        // A corrupted or unavailable local store should not block place search.
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const persist = useCallback(async (places: SavedPlace[]) => {
    try {
      await AsyncStorage.setItem(
        SAVED_PLACES_STORAGE_KEY,
        JSON.stringify(places.map((place) => placeToRecord(place, place.label))),
      );
    } catch {
      // Saving is a convenience; the current selection remains usable if storage is unavailable.
    }
  }, []);

  const savePlace = useCallback(async (place: Place, rawLabel: string) => {
    const label = rawLabel.trim();
    if (!label) return;
    const nextPlace: SavedPlace = {
      ...place,
      name: label,
      label,
      is_in_coverage: 'is_in_coverage' in place ? Boolean(place.is_in_coverage) : true,
    };
    setSavedPlaces((current) => {
      const withoutSamePlace = current.filter((saved) => saved.id !== place.id);
      const next = [nextPlace, ...withoutSamePlace].slice(0, MAX_SAVED_PLACES);
      void persist(next);
      return next;
    });
  }, [persist]);

  const removePlace = useCallback((id: string) => {
    setSavedPlaces((current) => {
      const next = current.filter((place) => place.id !== id);
      void persist(next);
      return next;
    });
  }, [persist]);

  return { savedPlaces, isLoading, savePlace, removePlace };
}
