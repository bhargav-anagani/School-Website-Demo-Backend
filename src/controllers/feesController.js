// ─────────────────────────────────────────────────────────────
// Fees Controller — Razorpay order creation + payment verification
// ─────────────────────────────────────────────────────────────
const Razorpay = require('razorpay');
const crypto  = require('crypto');
const { pool } = require('../config/db');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── CREATE RAZORPAY ORDER ─────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { fee_id } = req.body;

    // Find the fee record
    const [fees] = await pool.query('SELECT * FROM fees WHERE id = ?', [fee_id]);
    if (!fees.length) return res.status(404).json({ success: false, message: 'Fee not found.' });

    const fee = fees[0];
    if (fee.paid) return res.status(400).json({ success: false, message: 'Fee already paid.' });

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount:   Math.round(fee.amount * 100),
      currency: 'INR',
      receipt:  `fee_${fee_id}_${Date.now()}`,
      notes:    { fee_id, student_id: fee.student_id },
    });

    // Save order id
    await pool.query('UPDATE fees SET razorpay_order_id = ? WHERE id = ?', [order.id, fee_id]);

    res.json({
      success: true,
      data: {
        order_id:  order.id,
        amount:    order.amount,
        currency:  order.currency,
        key_id:    process.env.RAZORPAY_KEY_ID,
        fee_type:  fee.fee_type,
      },
    });
  } catch (err) { next(err); }
};

// ── VERIFY PAYMENT ────────────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_id } = req.body;

    // Verify signature
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                            .update(body).digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    // Mark fee as paid
    await pool.query(
      `UPDATE fees SET paid = TRUE, paid_date = CURDATE(), payment_method = 'razorpay',
       razorpay_payment_id = ?, transaction_id = ? WHERE id = ?`,
      [razorpay_payment_id, razorpay_payment_id, fee_id]
    );

    res.json({ success: true, message: 'Payment verified and recorded.', payment_id: razorpay_payment_id });
  } catch (err) { next(err); }
};

// ── ADD FEE (Admin) ───────────────────────────────────────────
const addFee = async (req, res, next) => {
  try {
    const { student_id, fee_type, amount, due_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO fees (student_id, fee_type, amount, due_date) VALUES (?, ?, ?, ?)',
      [student_id, fee_type || 'Tuition Fee', amount, due_date]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { next(err); }
};

// ── UPDATE FEE (Admin) ────────────────────────────────────────
const updateFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    // Check if paid
    const [fees] = await pool.query('SELECT paid FROM fees WHERE id = ?', [id]);
    if (!fees.length) return res.status(404).json({ success: false, message: 'Fee not found.' });
    if (fees[0].paid) return res.status(400).json({ success: false, message: 'Cannot edit an already paid fee.' });

    await pool.query('UPDATE fees SET amount = ? WHERE id = ?', [amount, id]);
    
    res.json({ success: true, message: 'Fee updated successfully.' });
  } catch (err) { next(err); }
};

// ── GET ALL FEES (Admin) ───────────────────────────────────────
const getAllFees = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, u.name AS student_name, s.roll_no, s.class FROM fees f
       JOIN students s ON f.student_id = s.id JOIN users u ON s.user_id = u.id ORDER BY f.due_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

// ── GET ALL STUDENTS WITH FEES (Admin) ─────────────────────────
const getStudentsWithFees = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id AS student_id, s.roll_no, s.class, u.name AS student_name,
              f.id AS fee_id, f.amount AS pending_amount, f.due_date, f.paid, f.fee_type
       FROM students s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN fees f ON s.id = f.student_id AND f.paid = FALSE
       ORDER BY s.class ASC, u.name ASC`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
};

module.exports = { createOrder, verifyPayment, addFee, getAllFees, updateFee, getStudentsWithFees };
