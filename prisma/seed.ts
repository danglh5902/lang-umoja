import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: `file:${process.env.DATABASE_PATH ?? "./prisma/dev.db"}`,
});
const prisma = new PrismaClient({ adapter });

const crimes = (waterPerDay: number, powerPerDay: number, landTaken: number) =>
  JSON.stringify({ waterPerDay, powerPerDay, landTaken });

const BUILDINGS = [
  {
    slug: "chatpho-ai",
    name: "ChatPhở AI",
    slogan: "Hỏi gì cũng trả lời. Trả lời gì cũng sai.",
    lore: "Chatbot tư vấn công thức phở được gọi vốn 2 triệu đô. Hỏi 'nước dùng nấu bao lâu?' nó trả lời 'Bạn thử hỏi lại xem'. Hỏi lại, nó gợi ý mua gói Premium. Server của nó nấu... nước làm mát nhiều hơn nước dùng.",
    crimes: crimes(42000, 1800, 900),
    goalAmount: 120000,
    gridX: 6,
    gridY: 5,
  },
  {
    slug: "trau-nft",
    name: "Trâu NFT 4.0",
    slogan: "Mỗi con trâu là một tài sản số độc bản.",
    lore: "Dự án bán 10.000 bức ảnh trâu do AI vẽ, con nào cũng sáu chân vì AI chưa học đếm. Sàn giao dịch sập sau 3 tuần, nhưng datacenter đào metadata thì vẫn chạy hết công suất, hút nước ngầm cả một vùng.",
    crimes: crimes(65000, 2400, 1200),
    goalAmount: 180000,
    gridX: 29,
    gridY: 4,
  },
  {
    slug: "capdao-ai",
    name: "CapDạo.ai",
    slogan: "Caption deep cho cuộc đời nông.",
    lore: "AI chuyên viết caption sống ảo kiểu 'Cà phê đắng như cách em rời đi'. Mỗi ngày sinh 40 triệu caption không ai đọc, đốt điện bằng một thị trấn nhỏ chỉ để nghĩ ra 1.000 cách nói 'buồn' khác nhau.",
    crimes: crimes(38000, 1500, 700),
    goalAmount: 100000,
    gridX: 33,
    gridY: 12,
  },
  {
    slug: "farm-1000-kenh",
    name: "Farm 1000 Kênh",
    slogan: "Nội dung bất tận. Giá trị bằng không.",
    lore: "Nhà máy video AI vận hành 1.000 kênh cùng lúc: giọng đọc robot, hình minh họa sai sự thật, tiêu đề giật gân. Mỗi video rác cần 2 lít nước làm mát — mỗi ngày farm này uống cạn một cái ao làng.",
    crimes: crimes(90000, 3600, 2000),
    goalAmount: 250000,
    gridX: 9,
    gridY: 27,
  },
  {
    slug: "boi-tarot-gpt",
    name: "Bói Tarot GPT",
    slogan: "Vũ trụ gửi tín hiệu. GPT gửi hóa đơn.",
    lore: "Xem bói bằng AI, 99k một lá bài. Lá nào cũng phán 'Sắp có biến chuyển lớn, hãy kiên nhẫn'. Độ chính xác ngang tung đồng xu nhưng chi phí điện nước thì rất thật, rất lớn, và rất không tâm linh.",
    crimes: crimes(28000, 1100, 500),
    goalAmount: 80000,
    gridX: 3,
    gridY: 14,
  },
  {
    slug: "pitch-vo-cuc",
    name: "Pitch Vô Cực",
    slogan: "Gọi vốn cho startup chưa — và sẽ không bao giờ — tồn tại.",
    lore: "AI sinh pitch deck tự động: 50 slide, 200 buzzword, 0 sản phẩm. Đã giúp 7.000 'founder' gọi vốn cho ý tưởng do chính AI bịa ra. Tiền đầu tư bốc hơi, chỉ còn hóa đơn tiền điện ở lại.",
    crimes: crimes(33000, 1300, 650),
    goalAmount: 110000,
    gridX: 31,
    gridY: 30,
  },
  {
    slug: "gaocoin-ai",
    name: "GạoCoin AI",
    slogan: "Blockchain + AI + Gạo = Niềm tin?",
    lore: "Dự án dùng AI dự đoán giá gạo để phát hành coin. AI dự đoán sai 9/10 lần, lần đúng duy nhất là dự đoán chính nó sẽ sập. Mỏ đào coin vẫn chạy, ruộng gạo thật thì khô nứt vì bị hút nước.",
    crimes: crimes(72000, 2900, 1500),
    goalAmount: 200000,
    gridX: 23,
    gridY: 9,
  },
  {
    slug: "tho-da-cap",
    name: "Thơ Tự Động Đa Cấp",
    slogan: "Mỗi vần thơ là một tầng hoa hồng.",
    lore: "AI làm thơ tặng kèm khóa học làm giàu: mua gói thơ 5 triệu, rủ thêm 2 người được lên 'Thi Sĩ Kim Cương'. Thơ thì dở, mô hình thì kim tự tháp, còn server thì xả khói đều như đọc rap.",
    crimes: crimes(25000, 1000, 450),
    goalAmount: 70000,
    gridX: 4,
    gridY: 31,
  },
  {
    slug: "sieu-tro-ly",
    name: "SiêuTrợLý 5.0",
    slogan: "Trợ lý ảo bận đến mức không giúp được ai.",
    lore: "Trợ lý AI văn phòng chỉ thành thạo một việc: đặt lịch họp với chính nó để bàn về các cuộc họp trước. Vòng lặp họp vô tận này tiêu thụ điện của cả một khu công nghiệp.",
    crimes: crimes(47000, 1900, 850),
    goalAmount: 140000,
    gridX: 27,
    gridY: 20,
  },
  {
    slug: "deepphake-studio",
    name: "DeepPhake Studio",
    slogan: "Gương mặt nào cũng có thể bán thực phẩm chức năng.",
    lore: "Xưởng ghép mặt người nổi tiếng (phiên bản hư cấu) vào video quảng cáo thuốc giảm cân. Render deepfake 24/7, mỗi gương mặt giả cần nước làm mát thật — nước mà lũ trẻ ở làng không có để uống.",
    crimes: crimes(81000, 3200, 1700),
    goalAmount: 230000,
    gridX: 12,
    gridY: 10,
  },
  {
    slug: "hoc-ai-cap-toc",
    name: "HọcAICấpTốc.vn",
    slogan: "Làm chủ AI trong 3 ngày — do AI dạy, AI chấm, AI cấp bằng.",
    lore: "Khóa học dạy 'làm chủ AI' mà giáo trình, bài giảng, chứng chỉ đều do AI sinh tự động. Học viên tốt nghiệp duy nhất tới nay là một con bot của chính hệ thống. Học phí thật, kiến thức ảo, điện nước tốn thật.",
    crimes: crimes(36000, 1400, 600),
    goalAmount: 95000,
    gridX: 18,
    gridY: 32,
  },
  {
    slug: "mang-xa-hoi-bot",
    name: "Mạng Xã Hội Bot",
    slogan: "Nơi 99% người dùng không phải là người.",
    lore: "Mạng xã hội nơi bot đăng bài, bot thả tim, bot cãi nhau với bot rồi bot làm hòa. Con người duy nhất là nhân viên trực server — và cậu ấy cũng đang xin nghỉ. Trung tâm dữ liệu của nó là tòa to nhất làng.",
    crimes: crimes(110000, 4500, 2500),
    goalAmount: 300000,
    gridX: 16,
    gridY: 2,
  },
];

const CHILDREN = [
  { name: "Amani", backstory: "Amani nghĩa là 'hòa bình'. Em từng câu cá ở con suối nay đã cạn vì trạm làm mát server.", gridX: 15, gridY: 16 },
  { name: "Zuri", backstory: "Zuri thích vẽ. Em vẽ cả làng bằng màu xanh — màu mà em chỉ còn thấy trong trí nhớ.", gridX: 14, gridY: 18 },
  { name: "Kofi", backstory: "Kofi sinh vào thứ Sáu. Em muốn làm kỹ sư để 'xây thứ gì đó có ích, không như mấy tòa kia'.", gridX: 20, gridY: 16 },
  { name: "Nia", backstory: "Nia nghĩa là 'mục đích'. Em đi bộ 6 cây số mỗi ngày để lấy nước kể từ khi giếng làng cạn.", gridX: 18, gridY: 20 },
  { name: "Juma", backstory: "Juma từng phụ bố trồng ngô trên mảnh ruộng giờ nằm dưới móng tòa Farm 1000 Kênh.", gridX: 13, gridY: 20 },
  { name: "Imani", backstory: "Imani nghĩa là 'niềm tin'. Em tin rằng một ngày cây sẽ mọc lại — nếu có ai đó giúp.", gridX: 21, gridY: 18 },
  { name: "Tendai", backstory: "Tendai hay kể chuyện cười cho các em nhỏ nghe để quên cơn đói.", gridX: 16, gridY: 15 },
  { name: "Ayo", backstory: "Ayo nghĩa là 'niềm vui'. Nụ cười của em là thứ duy nhất ở làng chưa bị lấy đi.", gridX: 19, gridY: 19 },
];

const ITEMS = [
  { slug: "banh-mi", name: "Bánh mì", emoji: "🍞", price: 10000, hungerEffect: 30, thirstEffect: 0, joyEffect: 5 },
  { slug: "nuoc-sach", name: "Nước sạch", emoji: "💧", price: 5000, hungerEffect: 0, thirstEffect: 30, joyEffect: 5 },
  { slug: "chao-dinh-duong", name: "Cháo dinh dưỡng", emoji: "🥣", price: 15000, hungerEffect: 40, thirstEffect: 15, joyEffect: 5 },
  { slug: "sach-vo", name: "Sách vở", emoji: "📚", price: 20000, hungerEffect: 0, thirstEffect: 0, joyEffect: 30 },
  { slug: "do-choi", name: "Đồ chơi", emoji: "🪁", price: 25000, hungerEffect: 0, thirstEffect: 0, joyEffect: 40 },
];

async function main() {
  await prisma.donation.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.building.deleteMany();
  await prisma.child.deleteMany();
  await prisma.item.deleteMany();
  await prisma.worldState.deleteMany();

  // các tòa đã chiếm đất từ lâu — mỗi tòa xuất hiện ở một thời điểm khác nhau trong quá khứ
  const DAY = 24 * 60 * 60 * 1000;
  await prisma.building.createMany({
    data: BUILDINGS.map((b, i) => ({
      ...b,
      createdAt: new Date(Date.now() - (6 + ((i * 17) % 40)) * DAY - ((i * 7) % 24) * 3600000),
    })),
  });
  await prisma.child.createMany({ data: CHILDREN });
  await prisma.item.createMany({ data: ITEMS });
  await prisma.worldState.create({ data: { id: 1 } });

  console.log(
    `Seeded: ${BUILDINGS.length} buildings, ${CHILDREN.length} children, ${ITEMS.length} items.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
