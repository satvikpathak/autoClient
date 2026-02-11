export interface PlaceResult {
  name: string;
  address: string;
  website: string;
  phone?: string;
  hasWebsite: boolean;
  rating?: number;
  reviewCount?: number;
  placeId: string;
}

interface PlacesTextSearchResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    rating?: number;
    userRatingCount?: number;
  }>;
}

export async function searchBusinesses(
  niche: string,
  location: string,
  maxResults: number = 20
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not configured');
  }

  const query = `${niche} in ${location}`;

  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchText',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: maxResults,
        languageCode: 'en',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Places API error: ${response.status} - ${error}`);
  }

  const data: PlacesTextSearchResponse = await response.json();

  if (!data.places) {
    return [];
  }

  // Filter and transform results
  const results: PlaceResult[] = data.places
    .filter(place => {
      // Filter out large corporate businesses (> 500 reviews)
      if (place.userRatingCount && place.userRatingCount > 500) return false;

      return true;
    })
    .map(place => ({
      name: place.displayName?.text || 'Unknown Business',
      address: place.formattedAddress || '',
      website: place.websiteUri || '',
      phone: place.nationalPhoneNumber,
      hasWebsite: Boolean(place.websiteUri),
      rating: place.rating,
      reviewCount: place.userRatingCount,
      placeId: place.id,
    }));

  return results;
}
