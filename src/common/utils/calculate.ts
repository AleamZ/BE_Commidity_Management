export const calculateCustomerDebt = (
  totalAmount: number,
  totalAmountDiscount: number,
  customerPaid: number,
) => {
  let debt = 0;

  if (totalAmountDiscount > 0) {
    debt = totalAmountDiscount - customerPaid;
  } else {
    debt = totalAmount - customerPaid;
  }

  const finalDebt = debt > 0 ? debt : 0;

  // Debug log cho các trường hợp bất thường
  if (finalDebt > 10000000) { // > 10M
    console.warn('=== UNUSUAL HIGH DEBT DETECTED ===');
    console.warn('Input values:', {
      totalAmount,
      totalAmountDiscount,
      customerPaid,
      calculatedDebt: finalDebt
    });
  }

  return finalDebt;
};

