"use strict";
(function () {
  const bank = window.EchoLessons;
  const phoneWords = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
  ];
  const phone = (answer) => ({
    answer,
    spoken: answer
      .split("")
      .map((n) => phoneWords[Number(n)])
      .join(" "),
    spell: false,
  });
  const phoneItems = [
    { ...bank.numbers[7], recorded: true },
    { ...bank.numbers[8], recorded: true },
    ...[
      "07700900456",
      "01632960418",
      "07812345690",
      "01132875419",
      "07911403268",
      "02083697541",
      "07518460922",
      "01315590483",
    ].map(phone),
  ];
  const addresses = [
    ...bank.numbers.filter((item) => !/^0\d{7,}$/.test(item.answer)),
    bank.codes.find((item) => item.answer === "Room 415"),
    bank.codes.find((item) => item.answer === "Room 208"),
  ];
  const definitions = [
    [
      "phone",
      "Số điện thoại",
      "Nghe chữ số liên tiếp, nhóm số và cách đọc double / triple.",
      phoneItems,
    ],
    [
      "streets",
      "Tên đường",
      "Đọc cả tên đường trước, đánh vần theo nhóm rồi nhắc lại tên.",
      bank.streets,
    ],
    [
      "names",
      "Tên riêng",
      "Phân biệt tên gần giống nhau và ghi đúng từng chữ.",
      bank.names,
    ],
    [
      "money",
      "Giá tiền",
      "Ghi giá tiền; luyện các cặp fifteen / fifty, sixteen / sixty.",
      bank.money,
    ],
    [
      "time",
      "Ngày & giờ",
      "Ghi ngày tháng và đổi cách đọc giờ thành dạng số.",
      bank.time,
    ],
    [
      "addresses",
      "Số & địa chỉ",
      "Nghe số nhà, căn hộ và số phòng.",
      addresses,
    ],
    [
      "codes",
      "Mã & số chuyến",
      "Ghi mã chữ-số, số phòng, chuyến bay và sân ga.",
      bank.codes,
    ],
    [
      "locations",
      "Địa điểm",
      "Nghe tên ga, sân bay, thành phố và khách sạn.",
      bank.locations,
    ],
    [
      "directions",
      "Chỉ đường",
      "Ghi cụm từ chỉ hướng, khoảng cách và vị trí.",
      bank.directions,
    ],
    [
      "work",
      "Công ty & sản phẩm",
      "Nghe tên công nghệ, sau đó kiểm tra bằng phần đánh vần.",
      bank.work,
    ],
  ];
  window.EchoCourses = Object.fromEntries(
    definitions.map(([key, title, objective, items], index) => [
      key,
      {
        id: index + 1,
        title,
        objective,
        items: items.slice(0, 10).map((item) => ({ ...item })),
      },
    ]),
  );
})();
