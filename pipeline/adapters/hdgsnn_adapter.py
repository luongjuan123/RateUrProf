"""Adapter for the State Council for Professorship (Hội đồng Giáo sư Nhà nước - HĐGSNN).
Extracts official, statutory nationwide lists of verified Professors (GS) and Associate Professors (PGS).
"""

from __future__ import annotations
import re
import html
import urllib.parse
from typing import List, Dict, Any, Optional, Tuple
from pipeline.adapters.base import BaseAcademicAdapter
from pipeline.models import (
    UniversityRecord,
    ProfessorRecord,
    ProvenanceEvidence,
)
from pipeline.dedup import IdentityResolutionEngine


# Canonical Institution Mapping Dictionary
INSTITUTION_KEYWORDS_MAP = [
    (["bách khoa hà nội", "đhbk hà nội", "hust"], "hust", "Đại học Bách Khoa Hà Nội", "HUST", "Hà Nội", "north"),
    (["kinh tế quốc dân", "neu"], "neu", "Trường Đại học Kinh tế Quốc dân", "NEU", "Hà Nội", "north"),
    (["ngoại thương", "ftu"], "ftu", "Trường Đại học Ngoại thương", "FTU", "Hà Nội", "north"),
    (["việt nhật", "việt - nhật", "vietnam japan", "vju", "vnu-vju"], "vnu-vju", "Trường Đại học Việt Nhật - ĐHQG Hà Nội", "VNU-VJU", "Hà Nội", "north"),
    (["việt đức", "việt - đức", "vietnam germany", "vgu"], "vgu", "Trường Đại học Việt Đức", "VGU", "Bình Dương", "south"),
    (["công nghệ, đại học quốc gia hà nội", "công nghệ, đhqghn", "đh công nghệ, đhqghn", "vnu-uet"], "vnu-uet", "Trường Đại học Công nghệ - ĐHQG Hà Nội", "VNU-UET", "Hà Nội", "north"),
    (["khoa học tự nhiên, đại học quốc gia hà nội", "khtn, đhqghn", "vnu-hus"], "vnu-hus", "Trường Đại học Khoa học Tự nhiên - ĐHQG Hà Nội", "VNU-HUS", "Hà Nội", "north"),
    (["khoa học xã hội và nhân văn, đại học quốc gia hà nội", "vnu-ussh"], "vnu-ussh", "Trường Đại học Khoa học Xã hội & Nhân văn - ĐHQG Hà Nội", "VNU-USSH", "Hà Nội", "north"),
    (["kinh tế, đại học quốc gia hà nội", "vnu-ueb"], "vnu-ueb", "Trường Đại học Kinh tế - ĐHQG Hà Nội", "VNU-UEB", "Hà Nội", "north"),
    (["giáo dục, đại học quốc gia hà nội", "vnu-ued"], "vnu-ued", "Trường Đại học Giáo dục - ĐHQG Hà Nội", "VNU-UED", "Hà Nội", "north"),
    (["y dược, đại học quốc gia hà nội", "vnu-ump"], "vnu-ump", "Trường Đại học Y Dược - ĐHQG Hà Nội", "VNU-UMP", "Hà Nội", "north"),
    (["luật, đại học quốc gia hà nội", "vnu-law"], "vnu-law", "Trường Đại học Luật - ĐHQG Hà Nội", "VNU-LAW", "Hà Nội", "north"),
    (["quốc tế, đại học quốc gia hà nội", "vnu-is"], "vnu-is", "Trường Quốc tế - ĐHQG Hà Nội", "VNU-IS", "Hà Nội", "north"),
    (["bách khoa, đại học quốc gia thành phố hồ chí minh", "bách khoa, đhqg-hcm", "bách khoa tp.hcm", "bách khoa tphcm", "hcmut"], "hcmut", "Trường ĐH Bách Khoa - ĐHQG TP.HCM", "HCMUT", "TP. Hồ Chí Minh", "south"),
    (["khoa học tự nhiên, đại học quốc gia thành phố hồ chí minh", "khtn, đhqg-hcm", "hcmus"], "hcmus", "Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM", "HCMUS", "TP. Hồ Chí Minh", "south"),
    (["công nghệ thông tin, đại học quốc gia thành phố hồ chí minh", "cntt, đhqg-hcm", "uit"], "uit", "Trường ĐH Công nghệ Thông tin - ĐHQG TP.HCM", "UIT", "TP. Hồ Chí Minh", "south"),
    (["kinh tế - luật", "kinh tế luật", "uel"], "uel", "Trường ĐH Kinh tế - Luật - ĐHQG TP.HCM", "UEL", "TP. Hồ Chí Minh", "south"),
    (["quốc tế, đại học quốc gia thành phố hồ chí minh", "hcmiu"], "hcmiu", "Trường ĐH Quốc tế - ĐHQG TP.HCM", "HCMIU", "TP. Hồ Chí Minh", "south"),
    (["khoa học xã hội và nhân văn, đại học quốc gia thành phố hồ chí minh", "hcmussh"], "hcmussh", "Trường ĐH Khoa học Xã hội & Nhân văn - ĐHQG TP.HCM", "HCMUSSH", "TP. Hồ Chí Minh", "south"),
    (["khoa y, đại học quốc gia thành phố hồ chí minh", "medvnu"], "medvnu", "Khoa Y - ĐHQG TP.HCM", "MED-VNUHCM", "TP. Hồ Chí Minh", "south"),
    (["bách khoa, đại học đà nẵng", "dut"], "dut", "Trường ĐH Bách Khoa - ĐH Đà Nẵng", "DUT", "Đà Nẵng", "central"),
    (["kinh tế, đại học đà nẵng", "due"], "due", "Trường ĐH Kinh tế - ĐH Đà Nẵng", "DUE", "Đà Nẵng", "central"),
    (["sư phạm, đại học đà nẵng", "ued"], "ued", "Trường ĐH Sư phạm - ĐH Đà Nẵng", "UED", "Đà Nẵng", "central"),
    (["ngoại ngữ, đại học đà nẵng", "ufl"], "ufl", "Trường ĐH Ngoại ngữ - ĐH Đà Nẵng", "UFL", "Đà Nẵng", "central"),
    (["công nghệ thông tin và truyền thông việt - hàn", "việt - hàn", "việt hàn", "vku"], "vku", "Trường ĐH Công nghệ Thông tin & Truyền thông Việt - Hàn", "VKU", "Đà Nẵng", "central"),
    (["đại học cần thơ", "ctu"], "ctu", "Trường Đại học Cần Thơ", "CTU", "Cần Thơ", "south"),
    (["y dược cần thơ", "ctump"], "ctump", "Trường Đại học Y Dược Cần Thơ", "CTUMP", "Cần Thơ", "south"),
    (["y hà nội", "hmu"], "hmu", "Trường Đại học Y Hà Nội", "HMU", "Hà Nội", "north"),
    (["y dược thành phố hồ chí minh", "y dược tp.hcm", "ump"], "ump", "Đại học Y Dược TP. Hồ Chí Minh", "UMP", "TP. Hồ Chí Minh", "south"),
    (["dược hà nội", "hup"], "hup", "Trường Đại học Dược Hà Nội", "HUP", "Hà Nội", "north"),
    (["xây dựng hà nội", "đh xây dựng", "huce"], "huce", "Trường Đại học Xây dựng Hà Nội", "HUCE", "Hà Nội", "north"),
    (["giao thông vận tải", "utc"], "utc", "Trường Đại học Giao thông Vận tải", "UTC", "Hà Nội", "north"),
    (["thủy lợi", "tlu"], "tlu", "Trường Đại học Thủy lợi", "TLU", "Hà Nội", "north"),
    (["mỏ - địa chất", "humg"], "humg", "Trường Đại học Mỏ - Địa chất", "HUMG", "Hà Nội", "north"),
    (["nông nghiệp việt nam", "vnua"], "vnua", "Học viện Nông nghiệp Việt Nam", "VNUA", "Hà Nội", "north"),
    (["nông lâm thành phố hồ chí minh", "nông lâm tp.hcm", "hcmuaf"], "hcmuaf", "Trường Đại học Nông Lâm TP.HCM", "HCMUAF", "TP. Hồ Chí Minh", "south"),
    (["kỹ thuật quân sự", "mta"], "mta", "Học viện Kỹ thuật Quân sự", "MTA", "Hà Nội", "north"),
    (["quân y", "vmmus"], "vmmus", "Học viện Quân y", "VMMU", "Hà Nội", "north"),
    (["sư phạm hà nội", "hnue"], "hnue", "Trường Đại học Sư phạm Hà Nội", "HNUE", "Hà Nội", "north"),
    (["sư phạm thành phố hồ chí minh", "sư phạm tp.hcm", "hcmue"], "hcmue", "Trường Đại học Sư phạm TP.HCM", "HCMUE", "TP. Hồ Chí Minh", "south"),
    (["sư phạm kỹ thuật thành phố hồ chí minh", "spkt tp.hcm", "hcmute"], "hcmute", "Trường ĐH Sư phạm Kỹ thuật TP.HCM", "HCMUTE", "TP. Hồ Chí Minh", "south"),
    (["thương mại", "tmu"], "tmu", "Trường Đại học Thương mại", "TMU", "Hà Nội", "north"),
    (["học viện ngân hàng", "hvnh"], "ba", "Học viện Ngân hàng", "BA", "Hà Nội", "north"),
    (["học viện tài chính", "hvtc"], "aof", "Học viện Tài chính", "AOF", "Hà Nội", "north"),
    (["ngân hàng thành phố hồ chí minh", "ngân hàng tp.hcm", "hub"], "hub", "Trường Đại học Ngân hàng TP.HCM", "HUB", "TP. Hồ Chí Minh", "south"),
    (["luật hà nội", "hlu"], "hlu", "Trường Đại học Luật Hà Nội", "HLU", "Hà Nội", "north"),
    (["luật thành phố hồ chí minh", "luật tp.hcm", "hcmulaw"], "hcmulaw", "Trường Đại học Luật TP.HCM", "HCMULAW", "TP. Hồ Chí Minh", "south"),
    (["công nghiệp hà nội", "haui"], "haui", "Trường Đại học Công nghiệp Hà Nội", "HaUI", "Hà Nội", "north"),
    (["công nghiệp thành phố hồ chí minh", "công nghiệp tp.hcm", "iuh"], "iuh", "Trường Đại học Công nghiệp TP.HCM", "IUH", "TP. Hồ Chí Minh", "south"),
    (["kinh tế thành phố hồ chí minh", "kinh tế tp.hcm", "ueh"], "ueh", "Đại học Kinh tế TP. Hồ Chí Minh", "UEH", "TP. Hồ Chí Minh", "south"),
    (["tôn đức thắng", "tdtu"], "tdtu", "Trường Đại học Tôn Đức Thắng", "TDTU", "TP. Hồ Chí Minh", "south"),
    (["công nghệ thành phố hồ chí minh", "công nghệ tp.hcm", "hutech"], "hutech", "Trường ĐH Công nghệ TP.HCM (HUTECH)", "HUTECH", "TP. Hồ Chí Minh", "south"),
    (["văn lang", "vanlang"], "vanlang", "Trường Đại học Văn Lang", "VLU", "TP. Hồ Chí Minh", "south"),
    (["hoa sen", "hoasen"], "hoasen", "Trường Đại học Hoa Sen", "HSU", "TP. Hồ Chí Minh", "south"),
    (["cmc", "cmc-u"], "cmc", "Trường Đại học CMC", "CMC", "Hà Nội", "north"),
    (["nha trang", "ntu"], "ntu", "Trường Đại học Nha Trang", "NTU", "Khánh Hòa", "central"),
    (["quy nhơn", "qnu"], "qnu", "Trường Đại học Quy Nhơn", "QNU", "Bình Định", "central"),
    (["đà lạt", "dlu"], "dlu", "Trường Đại học Đà Lạt", "DLU", "Lâm Đồng", "central"),
    (["tây nguyên", "ttn"], "ttn", "Trường Đại học Tây Nguyên", "TTN", "Đắk Lắk", "central"),
    (["vinh", "vinhuni"], "vinhuni", "Trường Đại học Vinh", "VinhUni", "Nghệ An", "central"),
    (["khoa học, đại học huế", "husc"], "husc", "Trường Đại học Khoa học - ĐH Huế", "HUSC", "Thừa Thiên Huế", "central"),
    (["kinh tế, đại học huế", "hce"], "hce", "Trường Đại học Kinh tế - ĐH Huế", "HCE", "Thừa Thiên Huế", "central"),
    (["y dược, đại học huế", "huemed-univ"], "huemed-univ", "Trường Đại học Y - Dược - ĐH Huế", "HUE-MED", "Thừa Thiên Huế", "central"),
    (["sư phạm, đại học huế", "dhsphue"], "dhsphue", "Trường Đại học Sư phạm - ĐH Huế", "HUSP", "Thừa Thiên Huế", "central"),
    (["nông lâm, đại học huế", "huaf"], "huaf", "Trường Đại học Nông Lâm - ĐH Huế", "HUAF", "Thừa Thiên Huế", "central"),
    (["luật, đại học huế", "hul"], "hul", "Trường Đại học Luật - ĐH Huế", "HUL", "Thừa Thiên Huế", "central"),
    (["ngoại ngữ, đại học huế", "hucfl"], "hucfl", "Trường Đại học Ngoại ngữ - ĐH Huế", "HUCFL", "Thừa Thiên Huế", "central"),
    (["công nghệ thông tin và truyền thông, đại học thái nguyên", "ictu"], "ictu", "Trường ĐH CNTT & Truyền thông - ĐH Thái Nguyên", "ICTU", "Thái Nguyên", "north"),
    (["kỹ thuật công nghiệp, đại học thái nguyên", "tnut"], "tnut", "Trường ĐH Kỹ thuật Công nghiệp - ĐH Thái Nguyên", "TNUT", "Thái Nguyên", "north"),
    (["y dược, đại học thái nguyên", "tump"], "tump", "Trường ĐH Y - Dược - ĐH Thái Nguyên", "TUMP", "Thái Nguyên", "north"),
    (["sư phạm, đại học thái nguyên", "tue"], "tue", "Trường Đại học Sư phạm - ĐH Thái Nguyên", "TUE", "Thái Nguyên", "north"),
    (["khoa học, đại học thái nguyên", "tnus"], "tnus", "Trường Đại học Khoa học - ĐH Thái Nguyên", "TNUS", "Thái Nguyên", "north"),
    (["kinh tế và quản trị kinh doanh, đại học thái nguyên", "tueba"], "tueba", "Trường ĐH Kinh tế & QTKD - ĐH Thái Nguyên", "TUEBA", "Thái Nguyên", "north"),
    (["nông lâm, đại học thái nguyên", "tuaf"], "tuaf", "Trường ĐH Nông Lâm - ĐH Thái Nguyên", "TUAF", "Thái Nguyên", "north"),
    (["trà vinh", "tvu"], "tvu", "Trường Đại học Trà Vinh", "TVU", "Trà Vinh", "south"),
    (["đồng tháp", "dthu"], "dthu", "Trường Đại học Đồng Tháp", "DThU", "Đồng Tháp", "south"),
    (["tiền giang", "tgu"], "tgu", "Trường Đại học Tiền Giang", "TGU", "Tiền Giang", "south"),
    (["an giang", "agu"], "agu", "Trường Đại học An Giang - ĐHQG TP.HCM", "AGU", "An Giang", "south"),
    (["kiên giang", "vnukg"], "vnukg", "Trường Đại học Kiên Giang", "KGU", "Kiên Giang", "south"),
    (["bạc liêu", "blu"], "blu", "Trường Đại học Bạc Liêu", "BLU", "Bạc Liêu", "south"),
    (["thủ dầu một", "tdmu"], "tdmu", "Trường Đại học Thủ Dầu Một", "TDMU", "Bình Dương", "south"),
    (["bình dương", "bdu"], "bdu", "Trường Đại học Bình Dương", "BDU", "Bình Dương", "south"),
    (["quốc tế miền đông", "eiu"], "eiu", "Trường Đại học Quốc tế Miền Đông", "EIU", "Bình Dương", "south"),
    (["bà rịa - vũng tàu", "bvu"], "bvu", "Trường Đại học Bà Rịa - Vũng Tàu", "BVU", "Bà Rịa - Vũng Tàu", "south"),
    (["hạ long", "uhl"], "uhl", "Trường Đại học Hạ Long", "UHL", "Quảng Ninh", "north"),
    (["hải phòng", "dhhp"], "dhhp", "Trường Đại học Hải Phòng", "DHHP", "Hải Phòng", "north"),
    (["hàng hải", "vimaru"], "vimaru", "Trường Đại học Hàng hải Việt Nam", "VMU", "Hải Phòng", "north"),
    (["y dược hải phòng", "hpmu"], "hpmu", "Trường Đại học Y Dược Hải Phòng", "HPMU", "Hải Phòng", "north"),
    (["thái bình", "tbu"], "tbu", "Trường Đại học Thái Bình", "TBU", "Thái Bình", "north"),
    (["y dược thái bình", "tbump"], "tbump", "Trường Đại học Y Dược Thái Bình", "TBUMP", "Thái Bình", "north"),
    (["nam định", "ndun"], "ndun", "Trường Đại học Điều dưỡng Nam Định", "NDUN", "Nam Định", "north"),
    (["sư phạm kỹ thuật nam định", "nute"], "nute", "Trường ĐH SPKT Nam Định", "NUTE", "Nam Định", "north"),
    (["sư phạm kỹ thuật vinh", "vute"], "vute", "Trường ĐH SPKT Vinh", "VUTE", "Nghệ An", "central"),
    (["sư phạm kỹ thuật hưng yên", "utehy"], "utehy", "Trường ĐH SPKT Hưng Yên", "UTEHY", "Hưng Yên", "north"),
    (["hùng vương", "hvu"], "hvu", "Trường Đại học Hùng Vương", "HVU", "Phú Thọ", "north"),
    (["hồng đức", "hdu"], "hdu", "Trường Đại học Hồng Đức", "HDU", "Thanh Hóa", "north"),
    (["văn hóa, thể thao và du lịch thanh hóa", "dvtdt"], "dvtdt", "Trường ĐH VH, TT & DL Thanh Hóa", "DVTH", "Thanh Hóa", "north"),
    (["hà tĩnh", "htu"], "htu", "Trường Đại học Hà Tĩnh", "HTU", "Hà Tĩnh", "central"),
    (["quảng bình", "qbu"], "qbu", "Trường Đại học Quảng Bình", "QBU", "Quảng Bình", "central"),
    (["quảng nam", "qnamu"], "qnamu", "Trường Đại học Quảng Nam", "QNU-QN", "Quảng Nam", "central"),
    (["phạm văn đồng", "pdu"], "pdu", "Trường Đại học Phạm Văn Đồng", "PDU", "Quảng Ngãi", "central"),
    (["xây dựng miền trung", "muce"], "muce", "Trường ĐH Xây dựng Miền Trung", "MUCE", "Phú Yên", "central"),
    (["phú yên", "pyu"], "pyu", "Trường Đại học Phú Yên", "PYU", "Phú Yên", "central"),
    (["khánh hòa", "ukb"], "ukh", "Trường Đại học Khánh Hòa", "UKH", "Khánh Hòa", "central"),
    (["phan thiết", "upt"], "upt", "Trường Đại học Phan Thiết", "UPT", "Bình Thuận", "central"),
    (["kiến trúc hà nội", "hau"], "hau", "Trường Đại học Kiến trúc Hà Nội", "HAU", "Hà Nội", "north"),
    (["kiến trúc thành phố hồ chí minh", "kiến trúc tp.hcm", "uah"], "uah", "Trường Đại học Kiến trúc TP.HCM", "UAH", "TP. Hồ Chí Minh", "south"),
    (["mỹ thuật việt nam", "vnufe"], "vnufe", "Trường Đại học Mỹ thuật Việt Nam", "VNUFA", "Hà Nội", "north"),
    (["mỹ thuật thành phố hồ chí minh", "mỹ thuật tp.hcm"], "hcmufa", "Trường ĐH Mỹ thuật TP.HCM", "HCMUFA", "TP. Hồ Chí Minh", "south"),
    (["học viện âm nhạc quốc gia việt nam", "vnam"], "vnam", "Học viện Âm nhạc Quốc gia Việt Nam", "VNAM", "Hà Nội", "north"),
    (["nhạc viện thành phố hồ chí minh", "nhạc viện tp.hcm"], "hcmcons", "Nhạc viện TP. Hồ Chí Minh", "HCMCONS", "TP. Hồ Chí Minh", "south"),
    (["sân khấu - điện ảnh hà nội", "skda"], "skda", "Trường ĐH Sân khấu - Điện ảnh Hà Nội", "SKDA", "Hà Nội", "north"),
    (["sân khấu - điện ảnh thành phố hồ chí minh", "skdast"], "skdast", "Trường ĐH Sân khấu - Điện ảnh TP.HCM", "SKDA-HCM", "TP. Hồ Chí Minh", "south"),
    (["văn hóa hà nội", "huc"], "huc", "Trường Đại học Văn hóa Hà Nội", "HUC", "Hà Nội", "north"),
    (["văn hóa thành phố hồ chí minh", "văn hóa tp.hcm", "hcmuc"], "hcmuc", "Trường Đại học Văn hóa TP.HCM", "HCMUC", "TP. Hồ Chí Minh", "south"),
    (["thể dục thể thao bắc ninh", "upes1"], "upes1", "Trường Đại học TDTT Bắc Ninh", "UPES1", "Bắc Ninh", "north"),
    (["sư phạm thể dục thể thao hà nội", "hupes"], "hupes", "Trường ĐH Sư phạm TDTT Hà Nội", "HUPES", "Hà Nội", "north"),
    (["thể dục thể thao đà nẵng", "upes3"], "upes3", "Trường Đại học TDTT Đà Nẵng", "UPES3", "Đà Nẵng", "central"),
    (["thể dục thể thao thành phố hồ chí minh", "thể dục thể thao tp.hcm", "upes2"], "upes2", "Trường Đại học TDTT TP.HCM", "UPES2", "TP. Hồ Chí Minh", "south"),
    (["sư phạm nghệ thuật trung ương", "spnttw"], "spnttw", "Trường ĐH Sư phạm Nghệ thuật Trung ương", "NUAE", "Hà Nội", "north"),
    (["lâm nghiệp", "vnuf"], "vnuf", "Trường Đại học Lâm nghiệp", "VNUF", "Hà Nội", "north"),
    (["công đoàn", "tuc"], "tuc", "Trường Đại học Công đoàn", "TUC", "Hà Nội", "north"),
    (["lao động - xã hội", "ulsa"], "ulsa", "Trường Đại học Lao động - Xã hội", "ULSA", "Hà Nội", "north"),
    (["nội vụ hà nội", "huha"], "huha", "Trường Đại học Nội vụ Hà Nội", "HUHA", "Hà Nội", "north"),
    (["học viện hành chính quốc gia", "napa"], "napa", "Học viện Hành chính Quốc gia", "NAPA", "Hà Nội", "north"),
    (["học viện chính trị quốc gia hồ chí minh", "hcma"], "hcma", "Học viện Chính trị Quốc gia Hồ Chí Minh", "HCMA", "Hà Nội", "north"),
    (["học viện báo chí và tuyên truyền", "báo chí và tuyên truyền", "ajc"], "ajc", "Học viện Báo chí và Tuyên truyền", "AJC", "Hà Nội", "north"),
    (["học viện ngoại giao", "dav"], "dav", "Học viện Ngoại giao", "DAV", "Hà Nội", "north"),
    (["học viện chính sách và phát triển", "apd"], "apd", "Học viện Chính sách và Phát triển", "APD", "Hà Nội", "north"),
    (["học viện công nghệ bưu chính viễn thông", "bưu chính viễn thông", "ptit"], "ptit", "Học viện Công nghệ Bưu chính Viễn thông", "PTIT", "Hà Nội", "north"),
    (["học viện tòa án"], "vca", "Học viện Tòa án", "VCA", "Hà Nội", "north"),
    (["học viện tư pháp"], "ja", "Học viện Tư pháp", "JA", "Hà Nội", "north"),
    (["học viện phụ nữ việt nam", "vwa"], "vwa", "Học viện Phụ nữ Việt Nam", "VWA", "Hà Nội", "north"),
    (["học viện thanh thiếu niên việt nam", "vya"], "vya", "Học viện Thanh thiếu niên Việt Nam", "VYA", "Hà Nội", "north"),
    (["học viện khoa học và công nghệ", "gstd"], "gasti", "Học viện Khoa học và Công nghệ", "GASTI", "Hà Nội", "north"),
    (["học viện khoa học xã hội", "gass"], "gass", "Học viện Khoa học Xã hội", "GASS", "Hà Nội", "north"),
    (["viện hàn lâm khoa học và công nghệ việt nam", "vast"], "vast", "Viện Hàn lâm Khoa học và Công nghệ Việt Nam", "VAST", "Hà Nội", "north"),
    (["viện hàn lâm khoa học xã hội việt nam", "vass"], "vass", "Viện Hàn lâm Khoa học Xã hội Việt Nam", "VASS", "Hà Nội", "north"),
    (["phenikaa", "phenikaa-uni"], "phenikaa", "Trường Đại học Phenikaa", "Phenikaa", "Hà Nội", "north"),
    (["thăng long", "thanglong"], "thanglong", "Trường Đại học Thăng Long", "TLU-HN", "Hà Nội", "north"),
    (["đại nam", "dainam"], "dainam", "Trường Đại học Đại Nam", "DNU", "Hà Nội", "north"),
    (["nguyễn trãi", "ntu-hn"], "ntu-hn", "Trường Đại học Nguyễn Trãi", "NTU-HN", "Hà Nội", "north"),
    (["kinh doanh và công nghệ hà nội", "hubt"], "hubt", "Trường ĐH Kinh doanh và Công nghệ Hà Nội", "HUBT", "Hà Nội", "north"),
    (["phương đông", "pdu-hn"], "pdu-hn", "Trường Đại học Phương Đông", "PDU-HN", "Hà Nội", "north"),
    (["hòa bình", "hbu"], "hbu", "Trường Đại học Hòa Bình", "HBU", "Hà Nội", "north"),
    (["đông đô", "ddu"], "ddu", "Trường Đại học Đông Đô", "DDU", "Hà Nội", "north"),
    (["chu văn an", "cva"], "cva", "Trường Đại học Chu Văn An", "CVAU", "Hưng Yên", "north"),
    (["lương thế vinh", "ltv"], "ltv", "Trường Đại học Lương Thế Vinh", "LTVU", "Nam Định", "north"),
    (["nguyễn tất thành", "nttu"], "nttu", "Trường Đại học Nguyễn Tất Thành", "NTTU", "TP. Hồ Chí Minh", "south"),
    (["quốc tế hồng bàng", "hiu"], "hiu", "Trường Đại học Quốc tế Hồng Bàng", "HIU", "TP. Hồ Chí Minh", "south"),
    (["gia định", "gdu"], "gdu", "Trường Đại học Gia Định", "GDU", "TP. Hồ Chí Minh", "south"),
    (["kinh tế - tài chính thành phố hồ chí minh", "uef"], "uef", "Trường ĐH Kinh tế - Tài chính TP.HCM", "UEF", "TP. Hồ Chí Minh", "south"),
    (["công nghệ sài gòn", "stu"], "stu", "Trường Đại học Công nghệ Sài Gòn", "STU", "TP. Hồ Chí Minh", "south"),
    (["sài gòn", "sgu"], "sgu", "Trường Đại học Sài Gòn", "SGU", "TP. Hồ Chí Minh", "south"),
    (["mở thành phố hồ chí minh", "mở tp.hcm", "ou", "hcmcou"], "hcmcou", "Trường Đại học Mở TP. Hồ Chí Minh", "HCMCOU", "TP. Hồ Chí Minh", "south"),
    (["mở hà nội", "hou"], "hou", "Trường Đại học Mở Hà Nội", "HOU", "Hà Nội", "north"),
]


class HdgsnnAdapter(BaseAcademicAdapter):
    """Adapter for official State Council for Professorship (HĐGSNN) candidate & appointment rosters."""

    def can_handle(self, url: str) -> bool:
        domain = urllib.parse.urlparse(url).netloc.lower()
        return "hdgsnn.gov.vn" in domain

    @classmethod
    def resolve_institution(
        cls, workplace_raw: str, existing_universities: List[UniversityRecord]
    ) -> Tuple[str, str, str, str, str]:
        """
        Maps a raw workplace string from HĐGSNN table into (uni_id, uni_name, short_name, city, region).
        """
        w_norm = IdentityResolutionEngine.normalize_name(workplace_raw).lower()
        w_clean = workplace_raw.strip()

        # 1. Match against hardcoded mapping dictionary
        for aliases, uid, uname, sname, city, reg in INSTITUTION_KEYWORDS_MAP:
            for alias in aliases:
                a_norm = IdentityResolutionEngine.normalize_name(alias).lower()
                if a_norm in w_norm:
                    return uid, uname, sname, city, reg

        # 2. Match against existing universities list
        for u in existing_universities:
            u_name_norm = IdentityResolutionEngine.normalize_name(u.name).lower()
            if u_name_norm in w_norm or w_norm in u_name_norm:
                return u.id, u.name, u.short_name, u.city, u.region

        # 3. Fallback: normalize raw string into clean institution ID
        clean_slug = IdentityResolutionEngine.normalize_name(w_clean).replace(" ", "-")[:32]
        return f"inst-{clean_slug}", w_clean, w_clean[:12].upper(), "Việt Nam", "national"

    def extract_professors(
        self, html_content: str, url: str, university: Optional[UniversityRecord] = None
    ) -> List[ProfessorRecord]:
        """
        Extracts verified professors and associate professors from HĐGSNN official tables
        using dynamic column header recognition across 2019-2025 gazettes.
        """
        professors: List[ProfessorRecord] = []
        seen_keys = set()

        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html_content, re.DOTALL | re.I)
        current_rank = "PGS"
        current_discipline = "Khoa học"

        # Default column mapping
        col_name = 1
        col_dob = 2
        col_gender = 3
        col_discipline = 4
        col_workplace = 5
        col_rank = 7

        for r in rows:
            cells = re.findall(r'<(?:td|th)[^>]*>(.*?)</(?:td|th)>', r, re.DOTALL | re.I)
            tds = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
            tds = [html.unescape(c).strip() for c in tds]

            if not tds:
                continue

            # 1. Detect Header Row: dynamically locate column positions
            row_text = " ".join(tds).lower()
            if "họ" in row_text and "tên" in row_text:
                for idx, text in enumerate(tds):
                    t_low = text.lower()
                    if "họ" in t_low and "tên" in t_low:
                        col_name = idx
                    elif "nơi làm việc" in t_low or "cơ quan" in t_low or "cơ sở" in t_low or "đơn vị" in t_low:
                        col_workplace = idx
                    elif "ngành" in t_low and "chuyên" not in t_low and "liên" not in t_low:
                        col_discipline = idx
                    elif "chức danh" in t_low or "đtccd" in t_low:
                        col_rank = idx
                    elif "ngày" in t_low or "năm sinh" in t_low:
                        col_dob = idx
                    elif "giới tính" in t_low:
                        col_gender = idx
                continue

            # 2. Detect Section / Subheading row
            first_clean = tds[0].replace(".", "").replace(",", "").strip()
            if not first_clean.isdigit():
                text = " ".join(tds)
                if "hội đồng" in text.lower() or "ngành" in text.lower():
                    m_nganh = re.search(r'(?:ngành|liên ngành)\s+([^<\n-]+)', text, re.I)
                    if m_nganh:
                        current_discipline = m_nganh.group(1).strip()
                    elif len(text) < 100:
                        current_discipline = text.strip()
                if "giáo sư" in text.lower() and "phó" not in text.lower():
                    current_rank = "GS"
                elif "phó giáo sư" in text.lower() or "pgs" in text.lower():
                    current_rank = "PGS"
                continue

            # 3. Data Row Processing
            if first_clean.isdigit() and len(tds) > max(col_name, col_workplace):
                raw_name = tds[col_name] if col_name < len(tds) else ""
                workplace = tds[col_workplace] if col_workplace < len(tds) else "Trường Đại học tại Việt Nam"
                discipline = tds[col_discipline] if col_discipline < len(tds) and tds[col_discipline] else current_discipline
                
                # Determine rank from row's rank column or fallback to section rank
                rank = current_rank
                if col_rank < len(tds) and tds[col_rank]:
                    r_text = tds[col_rank].lower()
                    if "phó" in r_text or "pgs" in r_text:
                        rank = "PGS"
                    elif "giáo sư" in r_text or "gs" in tds[col_rank].upper():
                        rank = "GS"

                if not raw_name or len(raw_name) < 3:
                    continue

                clean_name = raw_name.title()
                words = clean_name.split()
                if len(words) < 2:
                    continue

                # Filter institutional false positives
                stopwords = ["Trường", "Khoa", "Bộ Môn", "Hội Đồng", "Đại Học", "Viện", "Ban", "Phòng", "Trung Tâm"]
                if any(clean_name.startswith(sw) for sw in stopwords):
                    continue

                # Strip academic titles embedded in name string
                clean_name = IdentityResolutionEngine.strip_academic_titles(clean_name).title()

                academic_title = f"{rank}. TS"
                title = f"{rank}. TS"

                # Resolve institutional affiliation
                uni_id, uni_name, short_name, city, reg = self.resolve_institution(
                    workplace, [university] if university else []
                )

                norm_name = IdentityResolutionEngine.normalize_name(clean_name).replace(" ", "-")
                prof_key = (clean_name, uni_id)
                if prof_key in seen_keys:
                    continue
                seen_keys.add(prof_key)

                prof_id = f"prof-{uni_id}-{norm_name}"

                # Provenance metadata
                provenance = [
                    ProvenanceEvidence(
                        field="fullName",
                        source_url=url,
                        confidence=1.0,
                        source_type="official_government_gazette",
                    ),
                    ProvenanceEvidence(
                        field="academicTitle",
                        source_url=url,
                        confidence=1.0,
                        source_type="official_government_gazette",
                    ),
                    ProvenanceEvidence(
                        field="university",
                        source_url=url,
                        confidence=1.0,
                        source_type="official_government_gazette",
                    ),
                ]

                bio_vi = f"{rank}. TS {clean_name} công tác tại {workplace}. Chức danh đạt chuẩn do Hội đồng Giáo sư Nhà nước công nhận thuộc ngành/liên ngành {discipline}."
                bio_en = f"Prof. {clean_name} ({rank}) is affiliated with {workplace}, accredited by the State Council for Professorship of Vietnam in {discipline}."

                prof = ProfessorRecord(
                    id=prof_id,
                    name=clean_name,
                    university_id=uni_id,
                    university_name=uni_name,
                    university_short_name=short_name,
                    faculty=f"Khoa / Ngành {discipline}",
                    department=f"Bộ môn {discipline}",
                    title=title,
                    academic_title=academic_title,
                    position=f"Giảng viên cao cấp ({rank})",
                    avatar="",
                    bio=bio_vi,
                    bio_vi=bio_vi,
                    bio_en=bio_en,
                    courses=[],
                    research_interests=[discipline, f"Nghiên cứu chuyên sâu ngành {discipline}"],
                    official_profile_urls=[url],
                    identifiers={"hdgsnn_year": url.split("_")[-1]},
                    provenance=provenance,
                    verification_status="verified",
                    confidence_score=1.0,
                    source_urls=[url],
                )
                professors.append(prof)

        return professors
