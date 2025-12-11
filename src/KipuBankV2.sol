// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title KipuBank
 * @author [Your Name]
 * @notice A secure personal vault system for depositing and withdrawing native ETH
 * @dev Implements security best practices including CEI pattern, custom errors, and NatSpec documentation
 */
contract KipuBank {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Maximum amount that can be withdrawn in a single transaction
    /// @dev Immutable variable set at deployment to prevent modification
    uint256 public immutable WITHDRAWAL_LIMIT;

    /// @notice Maximum total deposits the bank can accept across all users
    /// @dev This creates a global cap for the entire contract
    uint256 public constant BANK_CAP = 1000 ether;

    /// @notice Total amount of ETH currently deposited in the bank
    /// @dev Updated on every deposit and withdrawal
    uint256 public totalDeposits;

    /// @notice Total number of deposit transactions processed
    uint256 public depositCount;

    /// @notice Total number of withdrawal transactions processed
    uint256 public withdrawalCount;

    /// @notice Mapping of user addresses to their personal vault balances
    mapping(address => uint256) private userVaults;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a user successfully deposits ETH
    /// @param user Address of the depositor
    /// @param amount Amount of ETH deposited
    /// @param newBalance User's new total balance in their vault
    event Deposit(address indexed user, uint256 amount, uint256 newBalance);

    /// @notice Emitted when a user successfully withdraws ETH
    /// @param user Address of the withdrawer
    /// @param amount Amount of ETH withdrawn
    /// @param remainingBalance User's remaining balance in their vault
    event Withdrawal(address indexed user, uint256 amount, uint256 remainingBalance);

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when deposit amount is zero
    error KipuBank__DepositAmountMustBeGreaterThanZero();

    /// @notice Thrown when deposit would exceed the global bank cap
    error KipuBank__BankCapacityExceeded();

    /// @notice Thrown when withdrawal amount is zero
    error KipuBank__WithdrawalAmountMustBeGreaterThanZero();

    /// @notice Thrown when withdrawal amount exceeds the per-transaction limit
    error KipuBank__WithdrawalExceedsLimit();

    /// @notice Thrown when user tries to withdraw more than their balance
    error KipuBank__InsufficientBalance();

    /// @notice Thrown when ETH transfer fails
    error KipuBank__TransferFailed();

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the KipuBank contract with a withdrawal limit
     * @param _withdrawalLimit Maximum amount that can be withdrawn per transaction
     * @dev The withdrawal limit is immutable and cannot be changed after deployment
     */
    constructor(uint256 _withdrawalLimit) {
        WITHDRAWAL_LIMIT = _withdrawalLimit;
    }

    /*//////////////////////////////////////////////////////////////
                            MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Validates that an amount is greater than zero
     * @param amount The amount to validate
     * @dev Used to prevent zero-value transactions
     */
    modifier validAmount(uint256 amount) {
        if (amount == 0) {
            revert KipuBank__DepositAmountMustBeGreaterThanZero();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposits ETH into the caller's personal vault
     * @dev Follows checks-effects-interactions pattern for security
     * @dev Emits a Deposit event on success
     * Requirements:
     * - msg.value must be greater than zero
     * - Total deposits must not exceed BANK_CAP
     */
    function deposit() external payable validAmount(msg.value) {
        // Checks
        if (totalDeposits + msg.value > BANK_CAP) {
            revert KipuBank__BankCapacityExceeded();
        }

        // Effects
        userVaults[msg.sender] += msg.value;
        totalDeposits += msg.value;
        depositCount++;

        // Interactions (event emission)
        emit Deposit(msg.sender, msg.value, userVaults[msg.sender]);
    }

    /**
     * @notice Withdraws ETH from the caller's personal vault
     * @param amount The amount of ETH to withdraw
     * @dev Follows checks-effects-interactions pattern for security
     * @dev Emits a Withdrawal event on success
     * Requirements:
     * - amount must be greater than zero
     * - amount must not exceed WITHDRAWAL_LIMIT
     * - User must have sufficient balance in their vault
     */
    function withdraw(uint256 amount) external validAmount(amount) {
        // Checks
        if (amount > WITHDRAWAL_LIMIT) {
            revert KipuBank__WithdrawalExceedsLimit();
        }
        if (amount > userVaults[msg.sender]) {
            revert KipuBank__InsufficientBalance();
        }

        // Effects
        userVaults[msg.sender] -= amount;
        totalDeposits -= amount;
        withdrawalCount++;

        // Interactions
        emit Withdrawal(msg.sender, amount, userVaults[msg.sender]);
        _transferETH(msg.sender, amount);
    }

    /**
     * @notice Returns the balance of a specific user's vault
     * @param user The address of the user to query
     * @return The balance in the user's vault
     * @dev This is a view function and does not modify state
     */
    function getVaultBalance(address user) external view returns (uint256) {
        return userVaults[user];
    }

    /**
     * @notice Returns the caller's vault balance
     * @return The balance in the caller's vault
     * @dev Convenience function for users to check their own balance
     */
    function getMyBalance() external view returns (uint256) {
        return userVaults[msg.sender];
    }

    /*//////////////////////////////////////////////////////////////
                        PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Safely transfers ETH to a recipient
     * @param recipient The address to receive the ETH
     * @param amount The amount of ETH to transfer
     * @dev Uses call for safer ETH transfers
     * @dev Reverts with custom error if transfer fails
     */
    function _transferETH(address recipient, uint256 amount) private {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert KipuBank__TransferFailed();
        }
    }
}
