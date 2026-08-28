import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../../app.js'
import { prisma } from '../../db.js'
import {
    godfatherItemId,
    godfatherOriginalRating,
    samCollectionId,
    samId,
} from '../constants.js'

const app = createApp()

afterAll(async () => {
    await prisma.$disconnect()
})

describe('collection annotation routes', () => {
    it('accepts the maximum valid rating of 5', async () => {
        try {
            // Bug: this currently fails because the route schema incorrectly caps ratings at 4
            const response = await request(app)
                .patch(`/api/collections/${samCollectionId}/movies/${godfatherItemId}`)
                .set('X-User-Id', samId)
                .send({ rating: 5 })

            expect(response.status).toBe(200)
            expect(response.body.item.annotation.rating).toBe(5)
        } finally {
            await request(app)
                .patch(`/api/collections/${samCollectionId}/movies/${godfatherItemId}`)
                .set('X-User-Id', samId)
                .send({ rating: godfatherOriginalRating })
                .expect(200)
        }
    })
})
