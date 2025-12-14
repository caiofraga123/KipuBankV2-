// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KipuBank {

    uint256 public immutable WITHDRAWAL_LIMIT;

    uint256 public constant BANK_CAP = 1000 ether;

    uint256 public totalDeposits;

    uint256 public depositCount;

    uint256 public withdrawalCount;

    mapping(address => uint256) private userVaults;

    event Deposit(address indexed user, uint256 amount, uint256 newBalance);

    event Withdrawal(address indexed user, uint256 amount, uint256 remainingBalance);

    error KipuBank__DepositAmountMustBeGreaterThanZero();

    error KipuBank__BankCapacityExceeded();

    error KipuBank__WithdrawalAmountMustBeGreaterThanZero();

    error KipuBank__WithdrawalExceedsLimit();

    error KipuBank__InsufficientBalance();

    error KipuBank__TransferFailed();

    constructor(uint256 _withdrawalLimit) {
        WITHDRAWAL_LIMIT = _withdrawalLimit;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) {
            revert KipuBank__DepositAmountMustBeGreaterThanZero();
        }
        _;
    }

    function deposit() external payable validAmount(msg.value) {
        if (totalDeposits + msg.value > BANK_CAP) {
            revert KipuBank__BankCapacityExceeded();
        }

        userVaults[msg.sender] += msg.value;
        totalDeposits += msg.value;
        depositCount++;

        emit Deposit(msg.sender, msg.value, userVaults[msg.sender]);
    }

    function withdraw(uint256 amount) external validAmount(amount) {
        if (amount > WITHDRAWAL_LIMIT) {
            revert KipuBank__WithdrawalExceedsLimit();
        }
        if (amount > userVaults[msg.sender]) {
            revert KipuBank__InsufficientBalance();
        }

        userVaults[msg.sender] -= amount;
        totalDeposits -= amount;
        withdrawalCount++;

        emit Withdrawal(msg.sender, amount, userVaults[msg.sender]);
        _transferETH(msg.sender, amount);
    }

    function getVaultBalance(address user) external view returns (uint256) {
        return userVaults[user];
    }

    function getMyBalance() external view returns (uint256) {
        return userVaults[msg.sender];
    }

    function _transferETH(address recipient, uint256 amount) private {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert KipuBank__TransferFailed();
        }
    }
}
