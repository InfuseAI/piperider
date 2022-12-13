describe('Comparison Report [table-list-page, table-detail-page]', () => {
  it('should navigate to the table detail page', () => {
    cy.visit('http://localhost:3001');

    const tableDetailBtn = cy.get('[data-cy="navigate-report-detail"]').first();
    tableDetailBtn.click();
  });

  it('should navigate to the table detail page and back to overview page', () => {
    cy.visit('http://localhost:3001');

    const tableDetailBtn = cy.get('[data-cy="navigate-report-detail"]').first();
    tableDetailBtn.click();
  });

  it('should open and close the feedback modal', () => {
    cy.visit('http://localhost:3001');

    const feebackIcon = cy.get('[data-cy="open-feedback-modal"]');
    feebackIcon.click();
    cy.get('[data-cy="feedback-modal"]').should('be.visible');

    const closeButton = cy.get('[data-cy="close-feedback-modal"]');
    closeButton.click();
    cy.get('[data-cy="feedback-modal"]').should('not.exist');
  });
});

describe('Comparison Report [column-detail-page]', () => {
  it('should navigate between different column items from the column detail page (and have active selection)', () => {
    cy.visit('http://localhost:3001');

    const tableDetailBtn = cy.get('[data-cy="navigate-report-detail"]').first();
    tableDetailBtn.click();

    const firstColumnDetailListItem = cy
      .get('[data-cy="column-detail-list-item"]')
      .first();
    firstColumnDetailListItem.click();

    const secondColumnDetailListItem = cy
      .get('[data-cy="column-detail-list-item"]')
      .last();
    secondColumnDetailListItem.click();
  });
  it('should navigate to the assertions list page from table list page', () => {
    cy.visit('http://localhost:3001');

    const navigatBtn = cy.get('[data-cy="sidebar-ribbon-assertions"]');
    navigatBtn.first().click();
  });
  it('should navigate to the assertions list page from table list page', () => {
    cy.visit('http://localhost:3001/#/assertions');

    const navigatBtn = cy.get('[data-cy="sidebar-ribbon-tables"]');
    navigatBtn.first().click();
  });
});
