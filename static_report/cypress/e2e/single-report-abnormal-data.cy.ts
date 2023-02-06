describe('Single Report (profiler-e2e.db)', () => {
  it('Navigate thru Abnormal Datasets SR Pages ', () => {
    cy.visit('http://localhost:4000');
    //test redirect
    cy.wait(1000);
    cy.url().should('include', '/tables');
  });
});
