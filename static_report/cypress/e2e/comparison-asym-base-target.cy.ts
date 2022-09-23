describe('Comparison Report (sp500.db -> profiler-e2e.db)', () => {
  it('Navigate thru Abnormal Datasets CR Pages ', () => {
    cy.visit('http://localhost:4001');

    const toggleToSchema = cy.get('[data-cy="schema-view"]');
    toggleToSchema.click();

    const tableAccordionBtn = cy
      .get('[data-cy="table-list-accordion-btn"]')
      .first();
    tableAccordionBtn.should('be.visible');
    tableAccordionBtn.click();

    const tableListSchemaItem = cy
      .get('[data-cy="table-list-schema-item"]')
      .first();

    tableListSchemaItem.click();
  });
});
