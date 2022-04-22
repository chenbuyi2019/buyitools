//  https://blog.jjonline.cn/userInterFace/173.html
//  https://github.com/jjonline/calendar.js
declare namespace calendar {
    interface Data {
        /**
           * 这年的生肖动物
           */
        Animal: string,
        /**
           * 农历的 日 （汉字表示）
           */
        IDayCn: string,
        /**
           * 农历的 月 （汉字表示）
           */
        IMonthCn: string,
        /**
           * 农历的 节气 
           */
        Term: string,
        /**
           * 星座 
           */
        astro: string,
        /**
           * 节日 
           */
        festival: string,
        /**
           * 公历的 日 
           */
        cDay: number,
        /**
           * 公历的 月
           */
        cMonth: number,
        /**
           * 公历的 年份
           */
        cYear: number,
        /**
           * 农历的 日 （干支表示）
           */
        gzDay: string,
        /**
           * 农历的 月 （干支表示）
           */
        gzMonth: string,
        /**
           * 农历的 年 （干支表示）
           */
        gzYear: string,
        /**
           * 是否是农历闰月
           */
        isLeap: boolean,
        /**
           * 是否是农历节气
           */
        isTerm: boolean,
        /**
           * 是否是今天
           */
        isToday: boolean,
        /**
           * 农历的 日 （数字表示）
           */
        lDay: number,
        /**
           * 农历的 月 （数字表示）
           */
        lMonth: number,
        /**
           * 农历的 年 （数字表示）
           */
        lYear: number,
        /**
           * 星期几（数字表示，星期日为7，星期一为1）
           */
        nWeek: number,
        /**
           * 星期几（汉字表示）
           */
        ncWeek: string
    }

    /**
        * 传入阳历年月日获得详细的公历、农历object信息 <=>JSON
        * @param y  solar year
        * @param m  solar month
        * @param d  solar day
        * @return JSON object
        * @eg:console.log(calendar.solar2lunar(1987,11,01));
        */
    function solar2lunar(y: number, m: number, d: number): Data | -1

    /**
        * 传入农历年月日以及传入的月份是否闰月获得详细的公历、农历object信息 <=>JSON
        * @param y  lunar year
        * @param m  lunar month
        * @param d  lunar day
        * @param isLeapMonth  lunar month is leap or not.[如果是农历闰月第四个参数赋值true即可]
        * @return JSON object
        * @eg:console.log(calendar.lunar2solar(1987,9,10));
        */
    function lunar2solar(y: number, m: number, d: number, isLeapMonth: boolean): Data | -1

    /**
        * 传入农历数字月份返回汉语通俗表示法
        * @param lunar month
        * @return Cn string
        * @eg:var cnMonth = calendar.toChinaMonth(12) ;//cnMonth='腊月'
        */
    function toChinaMonth(m: number): string

    /**
        * 传入农历日期数字返回汉字表示法
        * @param lunar day
        * @return Cn string
        * @eg:var cnDay = calendar.toChinaDay(21) ;//cnMonth='廿一'
        */
    function toChinaDay(d: number): string
}