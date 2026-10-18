'use client'

import type {
  FeedEvent,
  Finance,
  Garage,
  PlaceDetail,
  Review,
  WorldResponse,
} from '@mapcar/contracts'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api } from './api'

type Page<T> = { items: T[]; nextCursor: string | null }

export const useWorld = () =>
  useQuery({
    queryKey: ['world'],
    queryFn: () => api<WorldResponse>('/v1/world'),
    staleTime: 30_000,
  })

export const usePlace = (slug: string) =>
  useQuery({
    queryKey: ['place', slug],
    queryFn: () => api<PlaceDetail>(`/v1/places/${slug}`),
    refetchInterval: 20_000,
  })

export const useFinance = () =>
  useQuery({
    queryKey: ['finance'],
    queryFn: () => api<Finance>('/v1/finance'),
    refetchInterval: 15_000,
  })

export const useGarage = () =>
  useQuery({
    queryKey: ['garage'],
    queryFn: () => api<Garage>('/v1/garage'),
    refetchInterval: 30_000,
  })

export const useReviews = () =>
  useInfiniteQuery({
    queryKey: ['reviews'],
    queryFn: ({ pageParam }) =>
      api<Page<Review>>(`/v1/reviews?limit=20${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })

export const useEvents = (type?: string) =>
  useInfiniteQuery({
    queryKey: ['events', type ?? 'all'],
    queryFn: ({ pageParam }) =>
      api<Page<FeedEvent>>(
        `/v1/events?limit=60${type ? `&type=${type}` : ''}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 20_000,
  })
