describe('Expense Flow', () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173');
    });

    it('allows user to navigate to add page', () => {
        cy.contains('Add New').click();
        cy.url().should('include', '/add');
    });

    it('shows dashboard elements', () => {
        cy.contains('Total Spent').should('be.visible');
        cy.contains('Recent Expenses').should('be.visible');
    });
});
