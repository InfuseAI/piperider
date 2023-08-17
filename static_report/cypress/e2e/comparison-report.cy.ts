describe('Comparison Report [table-list-page, table-detail-page]', () => {
  it('should navigate to the table detail page', () => {
    cy.visit('http://localhost:3001');
  });
  it('should navigate to assertions list page', () => {
    cy.visit('http://localhost:3001/#/assertions');
  });
  it('should navigate to BM page ', () => {
    cy.visit('http://localhost:3001/#/metrics');
  });
});
