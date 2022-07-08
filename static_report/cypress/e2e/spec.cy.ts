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
    cy.url().should('include', '/tables/DL');

    // Click tabs...
    cy.get('[data-cy="sr-report-tab-item"]').click();

    // Return to Index
    cy.get('[data-cy="sr-report-breadcrumb-back"]').click();
  });
  it('Navigate thru CR Pages', () => {});
});
