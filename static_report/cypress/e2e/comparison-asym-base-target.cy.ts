describe('Comparison Report (sp500.db -> profiler-e2e.db)', () => {
  it('Navigate thru Abnormal Datasets CR Pages ', () => {
    cy.visit('http://localhost:4001');

    const navigationButton = cy
      .get('[data-cy="navigate-report-detail"]')
      .first();
    navigationButton.should('be.visible');
    navigationButton.click();
  });
});
