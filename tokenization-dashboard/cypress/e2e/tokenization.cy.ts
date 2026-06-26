describe("T-REX Compliance & Tokenization Dashboard E2E", () => {
  beforeEach(() => {
    // Clear cookies to start unauthenticated
    cy.clearCookies()
  })

  it("should block unauthenticated access and redirect to login", () => {
    cy.visit("/investors")
    cy.url().should("include", "/login")
  })

  it("should successfully log in, register a new investor, toggle freeze, and update settings", () => {
    // 1. Visit login page and authenticates as ADMIN
    cy.visit("/login")
    cy.contains("Admin").click()
    
    // Should be redirected to investors list
    cy.url().should("include", "/investors")
    cy.contains("Investor Registry").should("be.visible")

    // 2. Add a new investor
    const targetWallet = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
    
    cy.get("#investor-wallet-input").type(targetWallet)
    cy.get("#investor-status-select").select("VERIFIED")
    cy.get("#investor-kyc-date").type("2026-06-26")
    
    cy.get("#submit-investor-btn").click()

    // Verification: Toast should indicate success and wallet should appear in table
    cy.contains("Investor Added").should("be.visible")
    cy.contains("0x8626f694...2C9C1199").should("be.visible")

    // 3. Try to freeze the new wallet
    cy.contains("0x8626f694...2C9C1199")
      .parent()
      .contains("ACTIVE")
      .click()
    
    cy.contains("Wallet Frozen").should("be.visible")
    
    // It should display FROZEN status now
    cy.contains("0x8626f694...2C9C1199")
      .parent()
      .contains("FROZEN")
      .should("be.visible")

    // 4. Navigate to Actions page and trigger Mint modal
    cy.contains("Operations & Import").click()
    cy.url().should("include", "/actions")
    
    cy.get("#mint-btn").click()
    cy.contains("Mint Compliant Tokens").should("be.visible")
    
    // Close modal
    cy.contains("Cancel").click()

    // 5. Go to Settings page, add a trusted issuer and save configuration
    cy.contains("Compliance & Settings").click()
    cy.url().should("include", "/settings")

    const newIssuer = "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe"
    cy.get("#new-issuer-input").type(newIssuer)
    cy.get("#add-issuer-btn").click()

    cy.contains("Remember to save changes to commit.").should("be.visible")
    cy.get("#save-settings-btn").click()
    cy.contains("Settings Updated").should("be.visible")
  })
})
