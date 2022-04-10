const { ethers } = require("hardhat");

exports.toWei = (num) => ethers.utils.parseEther(num.toString());
exports.fromWei = (num) => ethers.utils.formatEther(num);