describe('Home Page', () => {
  it('Navigate thru Normal SR Pages', () => {
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
  it('should open and close the feedback modal', () => {
    cy.visit('http://localhost:3000');

    // open the feedback modal
    const feebackIcon = cy.get('[data-cy="open-feedback-modal"]');
    feebackIcon.click();
    cy.get('[data-cy="feedback-modal"]').should('be.visible');

    // close the feedback modal
    const closeButton = cy.get('[data-cy="close-feedback-modal"]');
    closeButton.click();
    cy.get('[data-cy="feedback-modal"]').should('not.be.visible');
  });

  it('Navigate thru Normal CR Pages', () => {
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
  it('Navigate thru Abnormal Datasets SR Pages', () => {
    // ARRANGE
    cy.visit('http://localhost:4000');

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
    cy.url().should('include', '/tables/T_BOOL');

    // SingleReport
    // Click tabs...
    cy.get('[data-cy="sr-report-tab-item"]').click();

    // Return to Index
    cy.get('[data-cy="sr-report-breadcrumb-back"]').click();
  });
  it('Navigate thru Asymmetric Column CR Pages', () => {
    // ARRANGE
    cy.visit('http://localhost:4001');

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
    cy.url().should('include', '/tables/T_BOOL');

    // ComparisonReport
    // Click tabs...
    cy.get('[data-cy="cr-report-tab-item-profiling"]').click();
    cy.get('[data-cy="cr-report-tab-item-tests"]').click();

    // Return to Index
    cy.get('[data-cy="cr-report-breadcrumb-back"]').click();
  });
});

export {}; // fix esmodule warning
