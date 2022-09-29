describe('Comparison Report [table-list-page, table-detail-page]', () => {
  it('should expand the table overview by clicking items', () => {
    cy.visit('http://localhost:3001');

    const first = cy.get('[data-cy="table-list-accordion-btn"]').first();
    first.should('have.attr', 'aria-expanded', 'false');
    first.click();
    first.should('have.attr', 'aria-expanded', 'true');

    const second = cy.get('[data-cy="table-list-accordion-btn"]').eq(1);
    first.should('have.attr', 'aria-expanded', 'false');
    second.click();
    second.should('have.attr', 'aria-expanded', 'true');
    second.click();
    second.should('have.attr', 'aria-expanded', 'false');
  });

  it('should navigate to the table detail page', () => {
    cy.visit('http://localhost:3001');

    const tableDetailBtn = cy.get('[data-cy="navigate-report-detail"]').first();
    tableDetailBtn.click();
  });

  it('should navigate to the table detail page and back to overview page', () => {
    cy.visit('http://localhost:3001');

    const first = cy.get('[data-cy="table-list-accordion-btn"]').first();
    first.click();

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
  it('should navigate to the column detail page from the table list page (via summary)', () => {
    cy.visit('http://localhost:3001');

    const tableAccordionBtn = cy
      .get('[data-cy="table-list-accordion-btn"]')
      .first();
    tableAccordionBtn.click();
    const columnAccordionItem = cy
      .get('[data-cy="table-list-schema-item"]')
      .first();
    columnAccordionItem.click();
  });

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
});
