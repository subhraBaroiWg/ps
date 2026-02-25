const visitWithMocks = () => {
  cy.visit('/', {
    onBeforeLoad: (windowObject) => {
      ;(windowObject as Window & { __PICSEE_E2E_MOCKS__?: boolean }).__PICSEE_E2E_MOCKS__ =
        true
    },
  })
}

const imageFile = (name: string) => ({
  contents: Cypress.Buffer.from('mock-image-bytes'),
  fileName: name,
  mimeType: 'image/jpeg',
  lastModified: Date.now(),
})

describe('Uploader e2e flows with mocks', () => {
  it('handles unsupported file toast dismiss and auto-close', () => {
    cy.clock()
    visitWithMocks()

    cy.get('input[type="file"]').selectFile('tests/fixtures/not-image.txt', {
      force: true,
    })
    cy.contains('"not-image.txt" is not a supported image type.').should('be.visible')

    cy.get('button[aria-label="Dismiss notification"]').first().click()
    cy.contains('"not-image.txt" is not a supported image type.').should('not.exist')

    cy.get('input[type="file"]').selectFile('tests/fixtures/not-image.txt', {
      force: true,
    })
    cy.contains('"not-image.txt" is not a supported image type.').should('be.visible')
    cy.tick(5000)
    cy.contains('"not-image.txt" is not a supported image type.').should('not.exist')
  })

  it('queues files, filters statuses, and uploads pending items', () => {
    visitWithMocks()

    cy.get('input[type="file"]').selectFile(
      [imageFile('ok.jpg'), imageFile('fail.jpg')],
      { force: true },
    )

    cy.contains('All (2)').should('be.visible')
    cy.contains('Ready for upload (1)').should('be.visible')
    cy.contains('Failed (1)').should('be.visible')

    cy.contains('Failed (1)').click()
    cy.contains('fail.jpg').should('be.visible')

    cy.contains('All (2)').click()
    cy.contains('Upload All').click()

    cy.contains('Uploaded (1)').should('be.visible').click()
    cy.contains('ok.webp').should('be.visible')
  })

  it('removes a queued file', () => {
    visitWithMocks()

    cy.get('input[type="file"]').selectFile(imageFile('remove-me.jpg'), {
      force: true,
    })
    cy.contains('All (1)').should('be.visible')
    cy.contains('remove-me.webp').should('be.visible')

    cy.get('article button').first().click({ force: true })
    cy.contains('No files queued yet').should('be.visible')
  })
})
