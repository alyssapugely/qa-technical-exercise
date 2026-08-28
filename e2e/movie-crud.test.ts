import { expect, test } from '@playwright/test'
import { CollectionListPage } from './pages/collection-list.page'
import { CollectionViewPage } from './pages/collection-view.page'

test('user can add a movie to a collection, update the movie entry, and remove the movie from the collection', async ({ page }) => {
    const collectionList = new CollectionListPage(page)
    const collectionView = new CollectionViewPage(page)
    const collectionName = `playwright_movie_crud_${Date.now()}`

    await collectionList.goto()
    await collectionList.createCollection(collectionName)
    await collectionView.addMovie('The Last Unicorn')
    await collectionView.addMovieNote('The Last Unicorn', 'Iconic')
    // I would give it a 5, but there is a bug that prevents this
    // Bug: clicking 5 stars results in the error "That didn't work, rating: must be 1 to 5"
    await collectionView.rateMovie('The Last Unicorn', 4)
    await collectionView.editMovieNote('The Last Unicorn', 'A classic')
    await expect(collectionView.movieRating('The Last Unicorn', 4)).toBeVisible()
    await expect(collectionView.movieNote('The Last Unicorn', 'A classic')).toBeVisible()
    await collectionView.removeMovie('The Last Unicorn')
    await expect(collectionView.film('The Last Unicorn')).toHaveCount(0)
    await collectionView.deleteCollection(collectionName)
})