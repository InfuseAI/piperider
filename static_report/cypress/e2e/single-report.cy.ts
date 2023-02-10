describe('Single Report [table-list-page, table-detail-page]', () => {
  it('should navigate to the table list page', () => {
    cy.visit('http://localhost:3000/');
  });
  it('should navigate to assertions list page', () => {
    cy.visit('http://localhost:3000/#/assertions');
  });
  it('should navigate to BM page ', () => {
    cy.visit('http://localhost:3000/#/metrics');
  });
});
