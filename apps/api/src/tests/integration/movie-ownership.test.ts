import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { alexId, samCollectionId, samId } from '../constants.js'

const app = createApp()
let samMovieId: string
let samMovieAnnotation: unknown
let samMovieCount: number

beforeAll(async () => {
    const samGetCollectionResponse = await request(app)
        .get(`/api/collections/${samCollectionId}`)
        .set('X-User-Id', samId)
        .expect(200)

    const samCollection = samGetCollectionResponse.body as {
        collection: {
            items: {
                id: string
                annotation: { note: string | null; tags: string[]; rating: number | null }
            }[]
        }
    }

    const samMovie = samCollection.collection.items[0]
    if (!samMovie) throw new Error('Seeded collection has no movies')

    samMovieId = samMovie.id
    samMovieAnnotation = samMovie.annotation
    samMovieCount = samCollection.collection.items.length
})

afterAll(async () => {
    await prisma.$disconnect()
})

describe('movie ownership', () => {
    it('asserts that one user cannot modify another users collection movies', async () => {
        await request(app)
            .post(`/api/collections/${samCollectionId}/movies`)
            .set('X-User-Id', alexId)
            .send({ tmdbId: 78 })
            .expect(404)

        await request(app)
            .patch(`/api/collections/${samCollectionId}/movies/${samMovieId}`)
            .set('X-User-Id', alexId)
            .send({ note: 'hijacked', tags: ['hijacked'], rating: 1 })
            .expect(404)

        await request(app)
            .delete(`/api/collections/${samCollectionId}/movies/${samMovieId}`)
            .set('X-User-Id', alexId)
            .expect(404)

        const samGetCollectionAgain = await request(app)
            .get(`/api/collections/${samCollectionId}`)
            .set('X-User-Id', samId)
            .expect(200)

        const samCollectionAgain = samGetCollectionAgain.body as {
            collection: {
                items: {
                    id: string
                    annotation: { note: string | null; tags: string[]; rating: number | null }
                }[]
            }
        }
        const samOriginalMovie = samCollectionAgain.collection.items.find((item) => item.id === samMovieId)

        expect(samOriginalMovie).toBeDefined()
        expect(samOriginalMovie?.annotation).toEqual(samMovieAnnotation)
        expect(samCollectionAgain.collection.items).toHaveLength(samMovieCount)
    })
})
