let processedData = [];
let avgSalaryByExperience = [];

//load in the csv using d3, converts the csv file into javscript object
//split the loading from the visualizations so the dataset doesn't have to be loaded in
//every time the window is resized
d3.csv("ds_salaries.csv").then(rawData => {
    //convert the string based entries into numerical fields for compututation
    rawData.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.remote_ratio = +d.remote_ratio;
    });

    //filter the dataset into only data scientists from 2023 making at 60,000
    //created smaller subset of the data so there would not be visual clutter
    const filteredData = rawData.filter(d => 
        d.job_title === "Data Scientist" &&
        +d.work_year === 2023 &&
        +d.salary_in_usd > 60000
    );

    processedData = filteredData.map(d => ({
        salaryK: +d.salary_in_usd / 1000,
        experience: d.experience_level,
        remote: d.remote_ratio,
        companySize: d.company_size,
    }));

    //use d3 nest functions to group by experience levels
    const nested = d3.nest()
        .key(d=>d.experience)
        //use the rollup functions to calculate the average salaries
        .rollup(v=>d3.mean(v,d=>d.salaryK))
        .entries(processedData);
    //remap the grouped data into a more simple array
    avgSalaryByExperience = nested.map(d => ({
        experience: d.key,
        avgSalary: d.value
    }));

    render();
});

window.addEventListener('resize', () => {
    render();
});


function render() {
    //clear the svg and remove all existing charts on each re-rendering of the page
    d3.select("svg").selectAll("*").remove(); 

    const svg = d3.select("svg"); // selecting the svg element to draw in 
    //values of the window to allow for resonsive resizing
    const fullWidth = window.innerWidth;
    const fullHeight = window.innerHeight;

    //set canvas to initially be the dimensions of the entire window
    svg.attr("width", fullWidth).attr("height", fullHeight);
        //svg canvas dimensions
        const scatterMargin = {top:40, right:40, bottom:60, left:60};
        const width = fullWidth / 2 - scatterMargin.left - scatterMargin.right;
        const height = fullHeight-scatterMargin.top - scatterMargin.bottom;
        //scatter plot of remote ratio vs salary for Data Scientists
        //x axis - remote ratio - 0, 0.5, 1
        //y axis - salary, filtering out salaries uder 60k
        svg.attr("width", fullWidth).attr("height", fullHeight);

    
        //append group element to the svg for the scatter plot 
        const g1 = svg.append("g")
            .attr("width", width + scatterMargin.left + scatterMargin.right)
            .attr("height", height + scatterMargin.top + scatterMargin.bottom)
            .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

        //adding the title of the graph
        g1.append("text")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .text("Remote Ratio vs Salary");
        
        //creating x label
        g1.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .text("Remote Ratio")
    
        //creating y label
        g1.append("text")
            .attr("x", -(height/2))
            .attr("y", -40)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("Salary");
    
    
        //creating the scale of the x axis
        const x1 = d3.scaleLinear()
        //remote ratio is either 0 50 100
        .domain([0,100])
        .range([0,width]);
    
        //use the axis generator to actually create the x axis and format it 
        const xAxis = d3.axisBottom(x1)
            .tickValues([0,50,100])
            .tickFormat(d => `${d}%`)
        
        g1.append("g")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis); // render the x axis using d3
    
        //same thing with y axis
        const y1 = d3.scaleLinear()
        //range will go from 0 to the highest salary in the dataset
        //allows the range to be scaled dynamically based
            .domain([0, d3.max(processedData, d=>d.salaryK)])
            .range([height,0])
    
        //create the y axis to be on the left
        const yAxis = d3.axisLeft(y1)
            .ticks(5)
            .tickFormat(d => `$${d}k`)
    
        g1.append("g")
            .call(yAxis)
    
        //bind processedData array to a circle for each entry
        //jitter the circles so it looks better
        const jitterAmount = 50;
        g1.selectAll("circle")
            .data(processedData)
            .enter()
            .append("circle")
            .attr("cx",d => x1(d.remote) + (Math.random() * jitterAmount - jitterAmount / 2))
            .attr("cy",d => y1(d.salaryK))
            .attr("r", 5)
            .attr("fill", "#69b3a2")
            .attr("opacity", 0.7);
        
        g1.append("rect")
            .attr("x", width - 120)
            .attr("y", 10)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", "#69b3a2")
            .attr("opacity", 0.7);
        
        g1.append("text")
            .attr("x", width - 100)
            .attr("y", 20)
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .text("Data Scientist");

        //new group for the bar chart
        const barMargin = {top:40, right:40, bottom:60, left:60};
        const barWidth = fullWidth * 0.4 - barMargin.left - barMargin.right;
        const barHeight = fullHeight * 0.45 - barMargin.top - barMargin.bottom;

        const parallelMargin = {top:40, right:60, bottom:60, left:60};
        const parallelWidth = fullWidth * 0.4 - parallelMargin.left - parallelMargin.right;
        const parallelHeight = fullHeight * 0.45 - parallelMargin.top - parallelMargin.bottom;
    
        //compute the x and y positions for each graph
        const g1_x = scatterMargin.left;
        const g1_y = scatterMargin.top;

        const g2_x = fullWidth - barWidth - barMargin.right - 80;
        const g2_y = barMargin.top+20;

        const g3_x = fullWidth - parallelWidth - parallelMargin.right - 80;
        const g3_y = fullHeight - parallelHeight - parallelMargin.bottom;

        //create another group element for the bar chart and position it
        const g2 = svg.append("g")
            .attr("transform", `translate(${g2_x}, ${g2_y})`);
    
        //create the x axis using scale band for categorical data
        const x2 = d3.scaleBand()
            //set the categories as the x axis - en, mi, en, se
            .domain(avgSalaryByExperience.map(d=>d.experience))
            .range([0, barWidth])
            .padding(0.2);
    
        //create the y axis linear scale for the average salaries - continuous
        const y2 = d3.scaleLinear()
            //dynamic upper bound
            .domain([0,d3.max(avgSalaryByExperience, d=>d.avgSalary)])
            .range([barHeight,0]);
    
        //add x axis to the bottom of the graph
        g2.append("g")
            .attr("transform",`translate(0, ${barHeight})`)
            .call(d3.axisBottom(x2));
        //add y axis to the left
        g2.append("g")
            .call(d3.axisLeft(y2).ticks(5).tickFormat(d=>`$${d}k`));
    
        //bind the data and draw the rectangles to represent the bars
        g2.selectAll("rect")
            .data(avgSalaryByExperience)
            .enter()
            .append("rect")
            .attr("x", d => x2(d.experience))
            .attr("y", d => y2(d.avgSalary))
            .attr("width", x2.bandwidth())
            .attr("height", d => barHeight - y2(d.avgSalary))
            .attr("fill", "#4682B4");
            g2.append("text")
            .attr("x", barWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .text("Avg Salary by Experience");
        
            //chart title above the chart
        g2.append("text")
            .attr("x", -barHeight / 2)
            .attr("y", -40)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .text("Salary (k)");
        //y axis label
        g2.append("text")
            .attr("x", barWidth / 2)
            .attr("y", barHeight + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .text("Experience Level");
    
        //square of the legend
        g2.append("rect")
            .attr("x", barWidth - 50)
            .attr("y", -20)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", "#4682B4");
        //legend label
        g2.append("text")
            .attr("x", barWidth - 35)
            .attr("y", -14)
            .attr("font-size", "12px")
            .attr("alignment-baseline", "middle")
            .text("Avg Salary by Exp");

        // Create the parallel coordinates group
        const g3 = svg.append("g")
            .attr("transform", `translate(${g3_x}, ${g3_y})`);

        g3.append("text")
            .attr("x", parallelWidth / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle") 
            .attr("font-size", "18px")
            .text("Salary Factors by Experience, Remote, and Company Size");
        
        //the different axes that will be used in the parallel coordinates plot 
        const dimensions = ["experience", "remote", "companySize", "salaryK"];
    
        //create a seperate y scale for each dimension
        const yScales = {
            //scale point to create a categorical scale for experience - se, en, mi, etc
            experience: d3.scalePoint()
            //use set to ensure that the experiences are unique
                .domain([...new Set(processedData.map(d => d.experience))])
                .range([parallelHeight,0]),
            
            //create numerical scale for the remote ratio
            remote: d3.scaleLinear()
                .domain([0,100])
                .range([parallelHeight,0]),
    
            //categorical scale for the company size
            companySize: d3.scalePoint()
                .domain([...new Set(processedData.map(d=>d.companySize))])
                .range([parallelHeight, 0]),
    
            //axes for the salary in thousands, adjust max salary dynamically
            salaryK: d3.scaleLinear()
                .domain([0,d3.max(processedData, d=>d.salaryK)])
                .range([parallelHeight,0])
        };
        //create the x axis that will space out the vertical axes
        //domain of the x axis will be all of the dimensions
        const xParallel = d3.scalePoint()
            .domain(dimensions)
            .range([0, parallelWidth])
    
        //create one line per data point
        function path(d) {
            return d3.line()(dimensions.map(p=>[xParallel(p), yScales[p](d[p])])); //map each dimension to [x,y] values
        }
    
        //create the color scale to differentiate between company size
        //makes it easier for users to differentiate between all of the lines
        const colorScale = d3.scaleOrdinal()
            .domain(["S","M","L"])
            .range(["#1f77b4", "#2ca02c", "#d62728"]);
    
        //draw line for each data entry
        g3.selectAll("path")
            .data(processedData)
            .enter()
            .append("path")
            .attr("d",path) //path function to define the shape
            .attr("fill","none")
            .attr("stroke",d => colorScale(d.companySize))
            .attr("stroke-width", 1)
            .attr("opacity", 0.5);
    
        //add the vertical axes and labels for each dimension
        dimensions.forEach(dimension => {
            g3.append("g") // create d3 group element for each axes
                .attr("transform", `translate(${xParallel(dimension)}, 0)`)
                .call(d3.axisLeft(yScales[dimension]))
                .append("text")
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "black")
                .text(dimension);
        });
        //create legend to the right of the graph
        const legend = g3.append("g")
            .attr("transform", `translate(${parallelWidth + 30}, 20)`);
    
    ["S", "M", "L"].forEach((size, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorScale(size));
        
        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 10)
            .attr("alignment-baseline", "middle")
            .attr("font-size", "12px")
            .text(() => {
                if (size === "S") return "Small";
                if (size === "M") return "Medium";
                return "Large";
            });
        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-size", "13px")
            .text("Company Size");
        
    });
    
    
    
}
