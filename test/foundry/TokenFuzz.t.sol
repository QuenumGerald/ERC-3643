// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "forge-std/Test.sol";
import "../../contracts/token/Token.sol";
import "../../contracts/registry/implementation/IdentityRegistry.sol";
import "../../contracts/registry/implementation/IdentityRegistryStorage.sol";
import "../../contracts/registry/implementation/ClaimTopicsRegistry.sol";
import "../../contracts/registry/implementation/TrustedIssuersRegistry.sol";
import "../../contracts/compliance/modular/IModularCompliance.sol";
import "@onchain-id/solidity/contracts/Identity.sol";
import "@onchain-id/solidity/contracts/ClaimIssuer.sol";

// Mock Compliance Contract
contract MockCompliance is IModularCompliance {
    address private _token;

    function bindToken(address _t) external override {
        _token = _t;
        emit TokenBound(_t);
    }

    function unbindToken(address _t) external override {
        _token = address(0);
        emit TokenUnbound(_t);
    }

    function addModule(address) external override {}
    function removeModule(address) external override {}
    function callModuleFunction(bytes calldata, address) external override {}
    function transferred(address, address, uint256) external override {}
    function created(address, uint256) external override {}
    function destroyed(address, uint256) external override {}

    function canTransfer(address, address, uint256) external view override returns (bool) {
        return true; // compliance allows all transfers, isolating IdentityRegistry checks
    }

    function getModules() external view override returns (address[] memory) {
        return new address[](0);
    }

    function getTokenBound() external view override returns (address) {
        return _token;
    }

    function isModuleBound(address) external view override returns (bool) {
        return false;
    }
}

contract TokenFuzzTest is Test {
    Token public token;
    IdentityRegistry public identityRegistry;
    IdentityRegistryStorage public identityRegistryStorage;
    ClaimTopicsRegistry public claimTopicsRegistry;
    TrustedIssuersRegistry public trustedIssuersRegistry;
    MockCompliance public compliance;
    ClaimIssuer public claimIssuerContract;

    uint256 public constant CLAIM_TOPIC = 1;
    uint256 public claimIssuerPrivateKey = 0xA11CE;
    address public claimIssuerSignerAddress;

    function setUp() public {
        claimIssuerSignerAddress = vm.addr(claimIssuerPrivateKey);

        // 1. Deploy Registries and Storage
        claimTopicsRegistry = new ClaimTopicsRegistry();
        claimTopicsRegistry.init();

        trustedIssuersRegistry = new TrustedIssuersRegistry();
        trustedIssuersRegistry.init();

        identityRegistryStorage = new IdentityRegistryStorage();
        identityRegistryStorage.init();

        identityRegistry = new IdentityRegistry();
        identityRegistry.init(
            address(trustedIssuersRegistry),
            address(claimTopicsRegistry),
            address(identityRegistryStorage)
        );

        identityRegistryStorage.bindIdentityRegistry(address(identityRegistry));

        // 2. Deploy Compliance and Token
        compliance = new MockCompliance();
        token = new Token();
        token.init(
            address(identityRegistry),
            address(compliance),
            "Fuzzed Token",
            "FZT",
            18,
            address(0)
        );

        // 3. Setup Agent Roles
        token.addAgent(address(this));
        identityRegistry.addAgent(address(this));

        // 4. Configure Trusted Claims Issuer
        claimIssuerContract = new ClaimIssuer(address(this));
        
        // Add claim signer key to ClaimIssuer (Purpose 3 = CLAIM)
        bytes32 signerKey = keccak256(abi.encode(claimIssuerSignerAddress));
        claimIssuerContract.addKey(signerKey, 3, 1);

        // Register claim topic
        claimTopicsRegistry.addClaimTopic(CLAIM_TOPIC);
        
        uint256[] memory topics = new uint256[](1);
        topics[0] = CLAIM_TOPIC;
        trustedIssuersRegistry.addTrustedIssuer(IClaimIssuer(address(claimIssuerContract)), topics);

        // Unpause token to enable transfers
        token.unpause();
    }

    // Helper to generate and add a valid KYC claim to an Identity
    function addKycClaim(Identity identityContract, address investor) internal {
        bytes memory claimData = abi.encodePacked("Verified KYC");
        bytes32 dataHash = keccak256(abi.encode(address(identityContract), CLAIM_TOPIC, claimData));
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(claimIssuerPrivateKey, prefixedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Call addClaim on the Identity contract using the manager key (address(this))
        vm.prank(address(this));
        identityContract.addClaim(CLAIM_TOPIC, 1, address(claimIssuerContract), signature, claimData, "");
    }

    /// @dev Invariant property 1: Only verified investors can hold tokens.
    /// Attempting to mint to an unverified address must fail.
    function testFuzz_MintOnlyToVerified(address investor, uint256 amount) public {
        // Prevent fuzzing address(0), precompiled contracts, or contracts
        vm.assume(investor != address(0));
        vm.assume(investor.code.length == 0);
        vm.assume(investor != address(this));
        vm.assume(investor != address(token));
        vm.assume(investor != address(identityRegistry));
        vm.assume(investor != address(identityRegistryStorage));
        vm.assume(investor != address(claimTopicsRegistry));
        vm.assume(investor != address(trustedIssuersRegistry));
        vm.assume(investor != address(compliance));
        vm.assume(investor != address(claimIssuerContract));
        
        vm.assume(amount > 0 && amount < 1_000_000_000_000 * 1e18);

        // Ensure initially the user is not verified
        assertFalse(identityRegistry.isVerified(investor));

        // Attempting to mint to an unverified address must fail
        vm.expectRevert("Identity is not verified.");
        token.mint(investor, amount);

        // Register identity contract for the investor (without any claims yet)
        Identity identityContract = new Identity(address(this), false);
        identityRegistry.registerIdentity(investor, identityContract, 1);

        assertFalse(identityRegistry.isVerified(investor));
        vm.expectRevert("Identity is not verified.");
        token.mint(investor, amount);

        // Now add the KYC claim
        addKycClaim(identityContract, investor);

        assertTrue(identityRegistry.isVerified(investor));

        // Minting should now succeed
        token.mint(investor, amount);
        assertEq(token.balanceOf(investor), amount);
    }

    /// @dev Invariant property 2: Transfers are only allowed to verified recipients.
    function testFuzz_TransferOnlyToVerified(
        address alice,
        address bob,
        uint256 mintAmount,
        uint256 transferAmount
    ) public {
        vm.assume(alice != address(0));
        vm.assume(bob != address(0));
        vm.assume(alice != bob);
        vm.assume(alice.code.length == 0);
        vm.assume(bob.code.length == 0);
        
        vm.assume(alice != address(this) && bob != address(this));
        vm.assume(alice != address(token) && bob != address(token));
        vm.assume(alice != address(identityRegistry) && bob != address(identityRegistry));
        
        vm.assume(mintAmount > 0 && mintAmount < 1_000_000_000 * 1e18);
        vm.assume(transferAmount > 0 && transferAmount <= mintAmount);

        // Setup verified Alice and mint tokens
        Identity aliceIdentity = new Identity(address(this), false);
        identityRegistry.registerIdentity(alice, aliceIdentity, 1);
        addKycClaim(aliceIdentity, alice);
        token.mint(alice, mintAmount);

        // Setup Bob (initially unverified)
        assertFalse(identityRegistry.isVerified(bob));

        // Transfer from Alice to Bob must fail
        vm.prank(alice);
        vm.expectRevert("Transfer not possible");
        token.transfer(bob, transferAmount);

        // Create identity for Bob and register it
        Identity bobIdentity = new Identity(address(this), false);
        identityRegistry.registerIdentity(bob, bobIdentity, 1);

        // Transfer should still fail since Bob does not have KYC claim
        vm.prank(alice);
        vm.expectRevert("Transfer not possible");
        token.transfer(bob, transferAmount);

        // Now verify Bob by adding claim
        addKycClaim(bobIdentity, bob);
        assertTrue(identityRegistry.isVerified(bob));

        // Transfer from Alice to Bob must now succeed
        vm.prank(alice);
        bool success = token.transfer(bob, transferAmount);
        assertTrue(success);
        assertEq(token.balanceOf(bob), transferAmount);
        assertEq(token.balanceOf(alice), mintAmount - transferAmount);
    }
}
