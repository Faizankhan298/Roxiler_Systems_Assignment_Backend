const axios = require("axios");
const Transaction = require("../models/transaction");

const fetchAndSeedData = async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    await Transaction.insertMany(response.data);
    res.status(200).send("Database seeded successfully");
  } catch (error) {
    res.status(500).send("Error seeding database");
  }
};

const listTransactions = async (req, res) => {
  const { month, search, page = 1, perPage = 10 } = req.query;
  const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1; // Convert month name to month number

  const query = {
    $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
  };

  if (search) {
    const searchRegex = new RegExp(search, "i");
    const searchConditions = [
      { title: searchRegex },
      { description: searchRegex },
    ];

    if (!isNaN(search)) {
      searchConditions.push({ price: Number(search) });
    }

    query.$or = searchConditions;
  }
  // console.log("Search Query",query);

  try { 
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getStatistics = async (req, res) => {
  const { month } = req.query;
  const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1; // Convert month name to month number

  const query = {
    $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
  };

  try {
    const totalSaleAmount = await Transaction.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);
    const totalSoldItems = await Transaction.countDocuments({
      ...query,
      sold: true,
    });
    const totalNotSoldItems = await Transaction.countDocuments({
      ...query,
      sold: false,
    });
    res.json({
      totalSaleAmount: totalSaleAmount[0]?.total || 0,
      totalSoldItems,
      totalNotSoldItems,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBarChart = async (req, res) => {
  const { month } = req.query;
  const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1; // Convert month name to month number

  const query = {
    $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
  };

  const priceRanges = [
    { range: "0-100", min: 0, max: 100 },
    { range: "101-200", min: 101, max: 200 },
    { range: "201-300", min: 201, max: 300 },
    { range: "301-400", min: 301, max: 400 },
    { range: "401-500", min: 401, max: 500 },
    { range: "501-600", min: 501, max: 600 },
    { range: "601-700", min: 601, max: 700 },
    { range: "701-800", min: 701, max: 800 },
    { range: "801-900", min: 801, max: 900 },
    { range: "901-above", min: 901, max: Infinity },
  ];

  try {
    const result = await Promise.all(
      priceRanges.map(async (range) => {
        const count = await Transaction.countDocuments({
          ...query,
          price: { $gte: range.min, $lt: range.max },
        });
        return { range: range.range, count };
      })
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPieChart = async (req, res) => {
  const { month } = req.query;
  const query = { dateOfSale: { $regex: `-${month.padStart(2, "0")}-` } };
  const categories = await Transaction.aggregate([
    { $match: query },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  res.json(categories);
};

const getCombinedData = async (req, res) => {
  const [transactions, statistics, barChart, pieChart] = await Promise.all([
    listTransactions(req, res),
    getStatistics(req, res),
    getBarChart(req, res),
    getPieChart(req, res),
  ]);
  res.json({ transactions, statistics, barChart, pieChart });
};

module.exports = {
  fetchAndSeedData,
  listTransactions,
  getStatistics,
  getBarChart,
  getPieChart,
  getCombinedData,
};
