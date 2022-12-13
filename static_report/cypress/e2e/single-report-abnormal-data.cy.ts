describe('Single Report (profiler-e2e.db)', () => {
  it('Navigate thru Abnormal Datasets SR Pages ', () => {
    cy.visit('http://localhost:4000');

    const navigationButton = cy
      .get('[data-cy="navigate-report-detail"]')
      .first();
    navigationButton.should('be.visible');
    navigationButton.click();
  });
});
