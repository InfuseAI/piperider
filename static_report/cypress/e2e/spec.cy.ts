describe('Home Page', () => {
  it('Navigate thru SR Pages', () => {
    // ARRANGE
    cy.visit('http://localhost:3000');

    // ACT (None: Loading only)

    // ASSERT
    // SROverview

    // SRList
    const list = cy.get('[data-cy="sr-report-list"]');
    list.should('be.visible');
    const listItem = cy
      .get('[data-cy="sr-report-list-item"]')
      .should('be.visible');
    // Click to navigate...
    listItem.first().click();
    // Check navigation success...
    cy.url().should('include', '/tables/ACTION');

    // SingleReport
    // Click tabs...
    cy.get('[data-cy="sr-report-tab-item"]').click();

    // Return to Index
    cy.get('[data-cy="sr-report-breadcrumb-back"]').click();
  });
  it('Navigate thru CR Pages', () => {
    // ARRANGE
    cy.visit('http://localhost:3001');

    // ACT (None: Loading only)

    // ASSERT
    // CROverview

    // CRList
    const list = cy.get('[data-cy="cr-report-list"]');
    list.should('be.visible');
    const listItem = cy
      .get('[data-cy="cr-report-list-item"]')
      .should('be.visible');
    // Click to navigate...
    listItem.first().click();
    // Check navigation success...
    cy.url().should('include', '/tables/ACTION');

    // ComparisonReport
    // Click tabs...
    cy.get('[data-cy="cr-report-tab-item-profiling"]').click();
    cy.get('[data-cy="cr-report-tab-item-tests"]').click();

    // Return to Index
    cy.get('[data-cy="cr-report-breadcrumb-back"]').click();
  });
});
