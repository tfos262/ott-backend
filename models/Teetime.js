class Teetime {
  constructor(db) {
    this.db = db;
    this.maxGolfers = 4;
    this.allPossibleTeeTimes = [];

    for (let hour = 8; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 15) {
        if (hour === 20 && min > 0) break;
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        this.allPossibleTeeTimes.push(`${h}:${m}`);
      }
    }
  }

  async getBookedMapByDate(date) {
    const [rows] = await this.db.query(
      `SELECT DATE_FORMAT(date_time, '%H:%i') AS time, COALESCE(SUM(num_golfers), 0) AS total_booked
       FROM teetime
       WHERE DATE(date_time) = ?
       GROUP BY time`,
      [date]
    );

    const bookedMap = {};
    rows.forEach(row => {
      bookedMap[row.time] = row.total_booked;
    });

    return bookedMap;
  }

  async getAvailableTeeTimes(date) {
    const bookedMap = await this.getBookedMapByDate(date);

    return this.allPossibleTeeTimes
      .map(time => {
        const booked = bookedMap[time] || 0;
        return {
          time,
          available_spots: this.maxGolfers - booked
        };
      })
      .filter(entry => entry.available_spots > 0);
  }

  async getReservedTeeTimes(date) {
    const bookedMap = await this.getBookedMapByDate(date);

    return this.allPossibleTeeTimes
      .filter(time => (bookedMap[time] || 0) > 0)
      .map(time => ({
        time,
        booked_spots: bookedMap[time]
      }));
  }

  async createReservation({ customer_id, num_golfers, total_price, paid, date_time }) {
    const q = `INSERT INTO teetime
        (customer_id, num_golfers, total_price, paid, date_time)
        VALUES (?)`;

    const values = [
      customer_id,
      num_golfers,
      total_price,
      paid,
      date_time
    ];

    const [result] = await this.db.query(q, [values]);
    return result.insertId;
  }

  async getAll() {
    const [rows] = await this.db.query('SELECT * FROM teetime');
    return rows;
  }

  async getByDate(date) {
    const [rows] = await this.db.query('SELECT * FROM teetime WHERE DATE(date_time) = ?', [date]);
    return rows;
  }
}

export default Teetime;
