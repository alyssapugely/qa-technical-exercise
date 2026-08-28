import { expect, type Page } from '@playwright/test'

export class CollectionListPage {
  constructor(private readonly page: Page) { }

  async goto() {
    await this.page.goto('/')
    await expect(this.page.getByRole('heading', { name: 'Collections' })).toBeVisible()
  }

  async createCollection(name: string) {
    await this.page.getByRole('textbox', { name: 'Name a new collection' }).fill(name)
    await this.page.getByRole('button', { name: 'Create' }).click()
  }

  async openCollection(name: string) {
    await this.page
      .getByRole('button', { name: `${name}` })
      .click()
  }

  collectionCard(name: string) {
    return this.page.getByRole('button', { name: `${name}` })
  }
}