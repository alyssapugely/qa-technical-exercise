import { expect, type Page } from '@playwright/test'

export class CollectionViewPage {
    constructor(private readonly page: Page) { }

    heading(name: string) {
        return this.page.getByRole('heading', { name: `${name} Rename` })
    }

    async renameCollection(newName: string) {
        await this.page.getByRole('button', { name: 'Rename' }).click()
        await this.page.getByRole('textbox').fill(newName)
        await this.page.getByRole('button', { name: 'Save' }).click()
    }

    async goBack() {
        await this.page.getByRole('button', { name: 'Back to collections' }).click()
    }

    async addMovie(title: string) {
        const search = this.page.getByRole('searchbox', { name: 'Add a film' })
        await search.fill(title)
        await this.page
            .locator('li.result')
            .filter({ hasText: title })
            .first()
            .getByRole('button')
            .click()
    }

    async rateMovie(movieTitle: string, rating: number) {
        const film = this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
        await film
            .getByRole('group', { name: 'Rating' })
            .getByRole('button', { name: `${rating} stars` })
            .click()
    }

    movieRating(movieTitle: string, rating: number) {
        const film = this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
        return film
            .getByRole('group', { name: 'Rating' })
            .getByRole('button', { name: `${rating} stars` })
    }

    async editMovieNote(movieTitle: string, note: string) {
        const film = this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
        await film.getByRole('button', { name: 'Edit' }).click()
        await film.getByRole('textbox', { name: 'Note' }).fill(note)
        await film.getByRole('button', { name: 'Save' }).click()
        await film.getByRole('button', { name: 'Done' }).click()
    }

    async addMovieNote(movieTitle: string, note: string) {
        const film = this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
        await film.getByRole('button', { name: 'Add notes' }).click()
        await film.getByRole('textbox', { name: 'Note' }).fill(note)
        await film.getByRole('button', { name: 'Save' }).click()
        await film.getByRole('button', { name: 'Done' }).click()
    }

    movieNote(movieTitle: string, note: string) {
        return this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
            .getByText(note)
    }

    async removeMovie(title: string) {
        const dialogPromise = this.page.waitForEvent('dialog').then(async (dialog) => {
            try {
                expect(dialog.message()).toContain(`Remove ${title}?`)
            } finally {
                await dialog.accept()
            }
        })

        await Promise.all([
            dialogPromise,
            this.page.getByRole('button', { name: 'Remove' }).click(),
        ])
    }

    film(movieTitle: string) {
        return this.page
            .locator('li.film')
            .filter({ hasText: movieTitle })
            .first()
    }

    async deleteCollection(name: string) {
        const dialogPromise = this.page.waitForEvent('dialog').then(async (dialog) => {
            try {
                expect(dialog.message()).toBe(`Delete ${name}?`)
            } finally {
                await dialog.accept()
            }
        })

        await Promise.all([
            dialogPromise,
            this.page.getByRole('button', { name: 'Delete collection' }).click(),
        ])
    }
}