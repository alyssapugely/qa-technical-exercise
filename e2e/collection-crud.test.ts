import { expect, test } from '@playwright/test'
import { CollectionListPage } from './pages/collection-list.page'
import { CollectionViewPage } from './pages/collection-view.page'

test('user can create, update, and delete a collection', async ({ page }) => {
  const collectionList = new CollectionListPage(page)
  const collectionView = new CollectionViewPage(page)
  const collectionName = `playwright_collection_crud_${Date.now()}`
  const renamedCollection = `${collectionName}_updated`

  await collectionList.goto()
  await collectionList.createCollection(collectionName)
  await expect(collectionView.heading(collectionName)).toBeVisible()

  await collectionView.renameCollection(renamedCollection)

  // Bug: when renaming a collection, the new name is not displayed until you navigate away or refresh the page
  // The test returns to the collection list page to assert that the collection name was updated
  await collectionView.goBack()
  await expect(collectionList.collectionCard(renamedCollection)).toBeVisible()

  await collectionList.openCollection(renamedCollection)
  await collectionView.deleteCollection(renamedCollection)
  await expect(collectionList.collectionCard(renamedCollection)).toHaveCount(0)
})
