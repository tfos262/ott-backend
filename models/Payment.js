// models/Payment.js
// models/Payment.js
class Payment {
  #card_number;  // private field for full card number (avoid exposing!)

  constructor(payment_id, customer_id, amount, payment_date, card_number = null) {
    this.payment_id = payment_id;
    this.customer_id = customer_id;
    this.amount = amount;
    this.payment_date = payment_date;
    this.#card_number = card_number;  // store privately
  }

  // Getter to get masked card number (e.g. **** **** **** 1234)
  getMaskedCardNumber() {
    if (!this.#card_number) return null;
    const last4 = this.#card_number.slice(-4);
    return `**** **** **** ${last4}`;
  }

  // Static factory method to create from plain object (e.g. from DB)
  static fromObject(obj) {
    return new Payment(
      obj.payment_id ?? obj.square_payment_id,
      obj.customer_id,
      obj.amount,
      obj.payment_date ?? obj.created_at,
      obj.card_number  // pass full card number if available (optional)
    );
  }

  format() {
    let paid_on = null;
    if (this.payment_date) {
      const dateObj = new Date(this.payment_date);
      if (!isNaN(dateObj)) {
        paid_on = dateObj.toISOString().split('T')[0];
      }
    }

    return {
      id: this.payment_id,
      customer_id: this.customer_id,
      amount: this.amount,
      paid_on,
      card_last4: this.getMaskedCardNumber()  // expose masked card info only
    };
  }
}

export default Payment;
