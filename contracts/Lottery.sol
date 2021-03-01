pragma solidity ^0.5.16;

contract Lottery {
    enum State {IDLE, BETTING}

    State public currentState = State.IDLE;
    address payable[] public players;
    uint256 public betCount;
    uint256 public betSize;
    uint256 public houseFee;
    address public admin;

    constructor(uint256 fee) public {
        require(fee > 1 && fee < 99, "Fee must be between 1 to 99");
        houseFee = fee;
        admin = msg.sender;
    }

    function createBet(uint256 count, uint256 size)
        external
        payable
        inState(State.IDLE)
        onlyAdmin
    {
        betCount = count;
        betSize = size;
        currentState = State.BETTING;
    }

    function bet() external payable inState(State.BETTING) {
        require(msg.value == betSize, "Can only bet exact bet size");
        // Add participant
        players.push(msg.sender);
        if (players.length == betCount) {
            uint256 winner = _randomModulo(betCount);
            players[winner].transfer(
                ((betSize * betCount) * (100 - houseFee)) / 100
            );
            currentState = State.IDLE;
            // Clean up players array
            delete players;
        }
    }

    function cancel() external inState(State.BETTING) onlyAdmin {
        for (uint256 i = 0; i < players.length; i++) {
            players[i].transfer(betSize);
        }
        delete players;
        currentState = State.IDLE;
    }

    function _randomModulo(uint256 modulo) internal view returns (uint256) {
        // This is a simple alternative to oracles
        // Not secure for contracts deployed to mainnet
        return
            uint256(
                keccak256(abi.encodePacked(block.timestamp, block.difficulty))
            ) % modulo;
    }

    modifier inState(State state) {
        require(
            currentState == state,
            "Current state does not allow transaction"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }
}
