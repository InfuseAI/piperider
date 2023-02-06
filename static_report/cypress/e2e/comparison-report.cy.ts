describe('Comparison Report [table-list-page, table-detail-page]', () => {
  it('should navigate to the table detail page', () => {
    cy.visit('http://localhost:3001');
    //test redirect
    cy.wait(1000);
    cy.url().should('include', '/tables');
  });
  it('should navigate to assertions list page', () => {
    cy.visit('http://localhost:3000/#/assertions');
  });
  it('should navigate to BM page ', () => {
    cy.visit('http://localhost:3000/#/metrics');
  });
});
