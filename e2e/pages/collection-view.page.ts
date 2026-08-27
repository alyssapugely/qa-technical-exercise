import { expect, type Page } from '@playwright/test'

export class CollectionViewPage {
    constructor(private readonly page: Page) { }

    heading(name: string) {
        return this.page.getByRole('heading', { name: `${name} Rename` })
    }

    async renameCollection(currentName: string, newName: string) {
        await this.page.getByRole('button', { name: 'Rename' }).click()
        await this.page.getByRole('textbox').fill(newName)
        await this.page.getByRole('button', { name: 'Save' }).click()
    }

    async goBack() {
        await this.page.getByRole('button', { name: 'Back to collections' }).click()
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