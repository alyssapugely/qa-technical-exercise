import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import { alexId, samId } from '../constants.js'

const app = createApp()

afterAll(async () => {
    await prisma.$disconnect()
})

describe('collection ownership', () => {
    it('asserts that one user cannot access another users collection', async () => {
        const samCollectionName = `collection_ownership_${Date.now()}`
        let samCollectionId: string | undefined

        try {
            const samCreateCollectionResponse = await request(app)
                .post('/api/collections')
                .set('X-User-Id', samId)
                .send({ name: samCollectionName })
                .expect(201)

            const samCollection = samCreateCollectionResponse.body as {
                collection: { id: string; name: string }
            }

            expect(samCollection.collection.name).toBe(samCollectionName)
            samCollectionId = samCollection.collection.id

            const alexListCollectionsResponse = await request(app)
                .get('/api/collections')
                .set('X-User-Id', alexId)
                .expect(200)

            const alexCollections = alexListCollectionsResponse.body as {
                collections: { id: string }[]
            }
            expect(alexCollections.collections).not.toEqual(
                expect.arrayContaining([expect.objectContaining({ id: samCollectionId })]),
            )

            await request(app)
                .get(`/api/collections/${samCollectionId}`)
                .set('X-User-Id', alexId)
                // Fails until getCollection filters by both collection ID and user ID
                // The current query filters only by collection ID, so Alex receives Sam's collection with 200
                .expect(404)

            await request(app)
                .patch(`/api/collections/${samCollectionId}`)
                .set('X-User-Id', alexId)
                .send({ name: 'hijacked' })
                .expect(404)

            await request(app)
                .delete(`/api/collections/${samCollectionId}`)
                .set('X-User-Id', alexId)
                .expect(404)

            const samReadResponse = await request(app)
                .get(`/api/collections/${samCollectionId}`)
                .set('X-User-Id', samId)
                .expect(200)

            const samGetCollection = samReadResponse.body as {
                collection: { name: string }
            }
            expect(samGetCollection.collection.name).toBe(samCollectionName)
        } finally {
            if (samCollectionId) {
                await request(app)
                    .delete(`/api/collections/${samCollectionId}`)
                    .set('X-User-Id', samId)
                    .expect(204)
            }
        }
    })
})
