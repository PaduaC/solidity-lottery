const Lottery = artifacts.require("Lottery");
const { expectRevert, time } = require("@openzeppelin/test-helpers");
const { web3 } = require("@openzeppelin/test-helpers/src/setup");

const balances = async (addresses) => {
  const balanceResults = await Promise.all(
    addresses.map((address) => web3.eth.getBalance(address))
  );
  return balanceResults.map((balance) => web3.utils.toBN(balance));
};

contract("Lottery", (accounts) => {
  let lottery;
  let admin = accounts[0];
  beforeEach(async () => {
    lottery = await Lottery.new(2);
  });

  it("Should NOT create bet if not admin", async () => {
    await expectRevert(
      lottery.createBet(10, 10, { from: accounts[5] }),
      "Admin only"
    );
  });

  it("Should NOT create bet if state not idle", async () => {
    await lottery.createBet(10, 10);
    await expectRevert(
      lottery.createBet(10, 10),
      "Current state does not allow transaction"
    );
  });

  it("Should create a bet", async () => {
    await lottery.createBet(10, 20);
    const betCount = await lottery.betCount();
    const betSize = await lottery.betSize();
    const state = await lottery.currentState();
    assert(betCount.toNumber() === 10);
    assert(betSize.toNumber() === 20);
    assert(state.toNumber() === 1);
  });

  it("Should NOT bet if not in state BETTING", async () => {
    await expectRevert(
      lottery.bet({ value: 10, from: accounts[1] }),
      "Current state does not allow transaction"
    );
  });

  it("Should NOT bet if not sending exact bet amount", async () => {
    await lottery.createBet(3, 20, { from: admin });
    await expectRevert(
      lottery.bet({ value: 100 }),
      "Can only bet exact bet size"
    );
    await expectRevert(
      lottery.bet({ value: 50 }),
      "Can only bet exact bet size"
    );
  });

  it("Should bet", async () => {
    const players = [accounts[1], accounts[2], accounts[3]];
    await lottery.createBet(3, web3.utils.toWei("1", "ether"));

    const balancesBefore = await balances(players);
    const txs = await Promise.all(
      players.map((player) =>
        lottery.bet({
          value: web3.utils.toWei("1", "ether"),
          from: player,
          gasPrice: 1,
        })
      )
    );
    const balancesAfter = await balances(players);
    const result = players.some((_player, i) => {
      const gasUsed = web3.utils.toBN(txs[i].receipt.gasUsed);
      const expected = web3.utils.toBN(web3.utils.toWei("1.94", "ether"));
      return balancesAfter[i].sub(balancesBefore[i]).add(gasUsed).eq(expected);
    });
    assert(result === true);
  });

  it("Should NOT cancel if not betting", async () => {
    await expectRevert(
      lottery.cancel({ from: accounts[1] }),
      "Current state does not allow transaction"
    );
  });

  it("Should NOT cancel if not admin", async () => {
    await lottery.createBet(10, 100);
    await expectRevert(lottery.cancel({ from: accounts[4] }), "Admin only");
  });

  it("Should cancel", async () => {
    await lottery.createBet(3, 100);
    await lottery.cancel();
    const state = await lottery.currentState();
    assert(state.toNumber() === 0);
  });
});
