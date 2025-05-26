let processedData = [];
let processedFullData = [];
let avgSalaryByExperience = [];
let selectedBarExperience = "All";

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

    processedFullData = rawData.map(d => ({
        work_year: +d.work_year,
        experience_level: d.experience_level,
        employment_type: d.employment_type,
        job_title: d.job_title,
        salary_in_usd: +d.salary_in_usd,
        remote_ratio: +d.remote_ratio,
        company_size: d.company_size,
        employee_residence: d.employee_residence,
        company_location: d.company_location
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

        // Define the zoom function FIRST (D3 v5 compatible)
        function zoomed() {
            const transform = d3.event.transform;
            
            // Transform the scatter plot content
            scatterContent.attr("transform", transform);
            
            // Create new scales based on the zoom transform
            const newXScale = transform.rescaleX(x1);
            const newYScale = transform.rescaleY(y1);
            
            // Update the axes with the new scales
            g1.select(".x-axis").call(d3.axisBottom(newXScale)
                .tickValues([0,50,100])
                .tickFormat(d => `${d}%`));
            g1.select(".y-axis").call(d3.axisLeft(newYScale)
                .ticks(5)
                .tickFormat(d => `${d}k`));
        }

        //create the zoom functionality
        const zoom = d3.zoom()
            .scaleExtent([0.5, 10])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]]) 
            .on("zoom", zoomed);
    
        //append group element to the svg for the scatter plot 
        const g1 = svg.append("g")
            .attr("width", width + scatterMargin.left + scatterMargin.right)
            .attr("height", height + scatterMargin.top + scatterMargin.bottom)
            .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`)
            
        const scatterContent = g1.append("g")
            .attr("class", "scatter-content");

        // Add a transparent rectangle to capture zoom events
        const zoomRect = g1.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "transparent")
            .attr("pointer-events", "all")
            .style("cursor", "move");

        // Apply zoom to the zoom rectangle
        zoomRect.call(zoom);

        //adding the title of the graph (outside zoom area)
        g1.append("text")
            .attr("class", "scatter-title")
            .attr("x", width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .text("Remote Ratio vs Salary");
        
        //creating x label (outside zoom area)
        g1.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .text("Remote Ratio")
    
        //creating y label (outside zoom area)
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
            .attr("class", "x-axis")
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
            .attr("class", "y-axis")
            .call(yAxis)
    
        //bind processedData array to a circle for each entry
        //jitter the circles so it looks better
        const jitterAmount = 50;
        scatterContent.selectAll("circle")
            .data(processedData)
            .enter()
            .append("circle")
            .attr("cx",d => x1(d.remote) + (Math.random() * jitterAmount - jitterAmount / 2))
            .attr("cy",d => y1(d.salaryK))
            .attr("r", 5)
            .attr("fill", "#69b3a2")
            .attr("opacity", 0.7);
        
        // Legend (outside zoom area)
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

        const parallelMargin = {top:40, right:100, bottom:160, left:60};
        const parallelWidth = fullWidth * 0.4 - parallelMargin.left - parallelMargin.right;
        const parallelHeight = fullHeight * 0.45 - parallelMargin.top - parallelMargin.bottom;
    
        //compute the x and y positions for each graph
        const g1_x = scatterMargin.left;
        const g1_y = scatterMargin.top;

        const g2_x = fullWidth - barWidth - barMargin.right - 80;
        const g2_y = barMargin.top+20;

        const g3_x = fullWidth - parallelWidth - parallelMargin.right - 80;
        const g3_y = fullHeight - parallelHeight - parallelMargin.bottom;

        function updateScatterPlotAnimated() {
            //filter data based on selected bar experience
            let scatterData = processedData; //original filtered data
            
            if (selectedBarExperience !== "All") {
                scatterData = processedData.filter(d => d.experience === selectedBarExperience);
            }
            //animate the circle fading out and then remove them
            scatterContent.selectAll("circle")
                .transition()
                .duration(250)
                .attr("opacity", 0)
                .attr("r", 2)
                .on("end", function() {
                    //remove the existing circle after successfulyy fading out
                    scatterContent.selectAll("circle").remove();
                    
                    //redraw with filtered data
                    const jitterAmount = 50;
                    const newCircles = scatterContent.selectAll("circle")
                        .data(scatterData)
                        .enter()
                        .append("circle")
                        .attr("cx", d => x1(d.remote) + (Math.random() * jitterAmount - jitterAmount / 2))
                        .attr("cy", d => y1(d.salaryK))
                        .attr("r", 0)
                        .attr("fill", "#69b3a2")
                        .attr("opacity", 0);
                    
                    //animate the new circles that are coming in
                    newCircles
                        .transition()
                        .duration(400)
                        .delay((d, i) => i * 1.5) // stagger them
                        .ease(d3.easeBackOut.overshoot(1.1))
                        .attr("r", 5)
                        .attr("opacity", 0.7);
                });
            
            //current title
            const titleElement = g1.select(".scatter-title");
            
            titleElement
                .transition()
                .duration(150)
                .attr("opacity", 0)
                .on("end", function() {
                    //allow the title to be dynamic when selecting different bars
                    g1.select(".scatter-title").remove();
                    g1.append("text")
                        .attr("class", "scatter-title")
                        .attr("x", width / 2)
                        .attr("y", -20)
                        .attr("text-anchor", "middle")
                        .attr("font-size", "18px")
                        .attr("opacity", 0)
                        .text(selectedBarExperience === "All" ? 
                            "Remote Ratio vs Salary" : 
                            `Remote Ratio vs Salary (${selectedBarExperience})`)
                        .transition()
                        .duration(150)
                        .attr("opacity", 1);
                });
        }

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
            .attr("fill", d => d.experience === selectedBarExperience ? "#4682B4" : "#6BA3D6")
            .attr("stroke", d => d.experience === selectedBarExperience ? "#2E5C8A" : "none")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(d) {
                //add a glowing effect when hovering over a bar
                d3.select(this)
                    .style("filter", "drop-shadow(0px 0px 8px rgba(70, 130, 180, 0.8))")
                    .transition()
                    .duration(200)
                    .attr("stroke-width", 3);
                
                //change color if not selected
                if (d.experience !== selectedBarExperience) {
                    d3.select(this).attr("fill", "#5A9BD4");
                }
                
                //tooltip to show the exact salary information
                const tooltip = g2.append("g")
                    .attr("class", "bar-tooltip")
                    .attr("transform", `translate(${x2(d.experience) + x2.bandwidth()/2}, ${y2(d.avgSalary) - 10})`);
                
                const rect = tooltip.append("rect")
                    .attr("fill", "black")
                    .attr("rx", 3)
                    .attr("opacity", 0.8);
                
                const text = tooltip.append("text")
                    .attr("fill", "white")
                    .attr("font-size", "12px")
                    .attr("text-anchor", "middle")
                    .attr("x", 0)
                    .attr("y", -5)
                    .text(`${d.experience}: $${Math.round(d.avgSalary)}k`);
                
                //ensure box fits text
                const bbox = text.node().getBBox();
                rect.attr("x", bbox.x - 5)
                    .attr("y", bbox.y - 2)
                    .attr("width", bbox.width + 10)
                    .attr("height", bbox.height + 4);
            })
            .on("mouseout", function(d) {
                //remove the glowing effect when hovering 
                d3.select(this)
                    .style("filter", "none")
                    .transition()
                    .duration(200)
                    .attr("stroke-width", d.experience === selectedBarExperience ? 2 : 0);
                
                //reset the color if nothing is selected
                if (d.experience !== selectedBarExperience) {
                    d3.select(this).attr("fill", "#6BA3D6");
                }
                
                g2.select(".bar-tooltip").remove();
            })
            //attach a click element to each bar
            .on("click", function(d) {
                
                //if already selected then deselect and return to all
                if (selectedBarExperience === d.experience) {
                    selectedBarExperience = "All";
                    //else select the bar
                } else {
                    selectedBarExperience = d.experience;
                }
                
                // clear the rest of the bars when one is selected
                g2.selectAll("rect").attr("fill", "#6BA3D6").attr("stroke", "none");
                d3.select(this).attr("fill", "#4682B4").attr("stroke", "#2E5C8A");
                
                // reset each bar if "all" is selected
                if (selectedBarExperience === "All") {
                    g2.selectAll("rect").attr("fill", "#6BA3D6").attr("stroke", "none");
                }
                
                updateScatterPlotAnimated();
            })


        //main bar chart title
        g2.append("text")
            .attr("x", barWidth / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .text("Avg Salary by Experience of Data Scientists");

        //instructions below the title
        g2.append("text")
            .attr("x", barWidth / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .style("font-style", "italic")
            .text("Click bars to filter scatter plot");

        
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

        // clear filter button to return graph to original state with animation
        g2.append("text")
            .attr("x", 10)
            .attr("y", -25)
            .attr("font-size", "12px")
            .attr("fill", "blue")
            .attr("text-decoration", "underline")
            .style("cursor", "pointer")
            .text("Clear Filter")
    .on("mouseover", function() {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("font-size", "13px")
            .attr("fill", "darkblue");
    })
    .on("mouseout", function() {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("font-size", "12px")
            .attr("fill", "blue");
    })
    .on("click", function() {
        // pulse animation to feel more responsive
        d3.select(this)
            .transition()
            .duration(100)
            .attr("opacity", 0.5)
            .transition()
            .duration(100)
            .attr("opacity", 1);
        
        selectedBarExperience = "All";
        
        // return bars to default
        g2.selectAll("rect")
            .transition()
            .duration(400)
            .attr("fill", "#6BA3D6")
            .attr("stroke", "none");
        
        updateScatterPlotAnimated();
    });

        // Create the parallel coordinates group
        const g3 = svg.append("g")
            .attr("transform", `translate(${g3_x}, ${g3_y})`);

        g3.append("text")
            .attr("x", parallelWidth / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle") 
            .attr("font-size", "18px")
            .text("Salary Factors by Experience, Remote, and Company Size");
        
        //the different axes for parallel coordinates plot
        const dimensions = ["experience_level", "employment_type", "remote_ratio", "company_size", "salary_in_usd"];
    
        //create a seperate y scale for each dimension
        const yScales = {
            //scale point to create a categorical scale for experience - se, en, mi, etc
            experience_level: d3.scalePoint()
            //use set to ensure that the experiences are unique
                .domain([...new Set(processedFullData.map(d => d.experience_level))])
                .range([parallelHeight,0]),
            
            //create numerical scale for the remote ratio
            remote_ratio: d3.scaleLinear()
                .domain([0,100])
                .range([parallelHeight,0]),
    
            //categorical scale for the company size
            company_size: d3.scalePoint()
                .domain([...new Set(processedFullData.map(d=>d.company_size))])
                .range([parallelHeight, 0]),
    
            //axes for the salary in thousands, adjust max salary dynamically
            salary_in_usd: d3.scaleLog()
                .domain([d3.min(processedFullData, d => d.salary_in_usd), d3.max(processedFullData, d => d.salary_in_usd)])
                .range([parallelHeight,0]),

            employment_type: d3.scalePoint()
                .domain([...new Set(processedFullData.map(d => d.employment_type))])
                .range([parallelHeight, 0])
        };
        //create the x axis that will space out the vertical axes
        //domain of the x axis will be all of the dimensions
        const xParallel = d3.scalePoint()
            .domain(dimensions)
            .range([0, parallelWidth])
    
        //create one line per data point
        function path(d) {
            try {
                return d3.line()(dimensions.map(p => {
                    //generate the line with x axis being the category ex experience level
                    //y value uses vertical scale to map the salary
                    const x = xParallel(p);
                    const y = yScales[p](d[p]);
                    return [x, y];
                }));
            } catch (error) {
                console.log("Path error for data:", d, error);
                return null;
            }
        }
    
        //create the color scale for all of the jobs
        const jobCategories = {
            "Data Scientist": "#1f77b4",
            "Data Engineer": "#ff7f0e", 
            "Data Analyst": "#2ca02c",
            "Machine Learning Engineer": "#d62728",
            "Research Scientist": "#9467bd",
            "Analytics Engineer": "#8c564b",
            "Other": "#e377c2"
        };

        //normalize the job titles to be more robust even though not necessary in this dataset
        function categorizeJob(jobTitle) {
            const title = jobTitle.toLowerCase();
            if (title.includes("data scientist")) return "Data Scientist";
            if (title.includes("data engineer")) return "Data Engineer";
            if (title.includes("data analyst") || title.includes("business analyst")) return "Data Analyst";
            if (title.includes("machine learning") || title.includes("ml engineer")) return "Machine Learning Engineer";
            if (title.includes("research scientist")) return "Research Scientist";
            if (title.includes("analytics engineer")) return "Analytics Engineer";
            return "Other";
        }

        processedFullData.forEach(d => {
            d.job_category = categorizeJob(d.job_title);
        });

        //create the color scale to differentiate between company size
        //makes it easier for users to differentiate between all of the lines
        const colorScale = d3.scaleOrdinal()
            .domain(Object.keys(jobCategories))
            .range(Object.values(jobCategories));

        const filterContainer = g3.append("g")
            .attr("transform", `translate(0, ${parallelHeight + 60})`);


        const experienceFilter = filterContainer.append("g");
        experienceFilter.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("font-size", "12px")
            .text("Filter by Experience:");
              
        let selectedExperience = "All";
        //allow the user to filter the graph by experience levels
        const experienceButtons = experienceFilter.selectAll(".exp-button")
            .data(["All", ...new Set(processedFullData.map(d => d.experience_level))])
            .enter()
            .append("g")
            .attr("class", "exp-button")
            .attr("transform", (d, i) => `translate(${i * 60}, 15)`);

        //create experience button for each level - SE EN MI EX
        experienceButtons.append("rect")
            .attr("width", 50)
            .attr("height", 20)
            .attr("fill", d => d === "All" ? "#333" : "#ccc")
            .attr("stroke", "#000")
            .style("cursor", "pointer");

        experienceButtons.append("text")
            .attr("x", 25)
            .attr("y", 15)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "white")
            .text(d => d);
        
        //draw line for each data entry
        function updateVisualization() {
            // Filter data based on selected criteria
            let filteredData = processedFullData;
            if (selectedExperience !== "All") {
                filteredData = filteredData.filter(d => d.experience_level === selectedExperience);
            }
        
            // Remove existing paths
            g3.selectAll(".data-path").remove();
        
            // Draw filtered lines
            g3.selectAll(".data-path")
                .data(filteredData)
                .enter()
                .append("path")
                .attr("class", "data-path")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", d => colorScale(d.job_category))
                .attr("stroke-width", 1)
                .attr("opacity", 0.6)
                //create a tooltip for each line that gives short information about each path
                .on("mouseover", function(d) {
                    // Highlight on hover
                    d3.select(this)
                        .attr("stroke-width", 3)
                        .attr("opacity", 1);
                    
                    // Show tooltip
                    const tooltip = g3.append("g")
                        .attr("class", "tooltip")
                        .attr("transform", `translate(${d3.mouse(this)[0]}, ${d3.mouse(this)[1]})`);
                    
                    const rect = tooltip.append("rect")
                        .attr("fill", "white")
                        .attr("stroke", "black")
                        .attr("rx", 3);
                    
                    const text = tooltip.append("text")
                        .attr("font-size", "12px")
                        .attr("x", 5)
                        .attr("y", 15);
                    
                    text.append("tspan").text(`Job: ${d.job_title}`).attr("x", 5).attr("dy", 0);
                    text.append("tspan").text(`Experience: ${d.experience_level}`).attr("x", 5).attr("dy", 15);
                    text.append("tspan").text(`Employment: ${d.employment_type}`).attr("x", 5).attr("dy", 15);
                    text.append("tspan").text(`Salary: $${Math.round(d.salary_in_usd).toLocaleString()}`).attr("x", 5).attr("dy", 15);
                    text.append("tspan").text(`Remote: ${d.remote_ratio}%`).attr("x", 5).attr("dy", 15);
                    text.append("tspan").text(`Company: ${d.company_size}`).attr("x", 5).attr("dy", 15);
                    
                    const bbox = text.node().getBBox();
                    rect.attr("width", bbox.width + 10).attr("height", bbox.height + 10);
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr("stroke-width", 1)
                        .attr("opacity", 0.6);
                    g3.select(".tooltip").remove();
                });
        }
        
        //add click handlers for experience filter
        experienceButtons.on("click", function(d) {
            selectedExperience = d;
            
            //reset all buttons to gray, then highlight selected
            experienceButtons.select("rect").attr("fill", "#ccc");
            d3.select(this).select("rect").attr("fill", "#333");
            
            updateVisualization();
        });
                
        // Add vertical axes and labels for each dimension
        dimensions.forEach(dimension => {
            const axis = g3.append("g")
                .attr("transform", `translate(${xParallel(dimension)}, 0)`);
            
            //customize axis based on dimension type
            if (dimension === "salary_in_usd") {
                // Use custom tick format for salary (log scale)
                axis.call(d3.axisLeft(yScales[dimension])
                    .tickFormat(d => `$${d/1000}k`));
            } else {
                axis.call(d3.axisLeft(yScales[dimension]));
            }
            
            //create the names for the axes
            axis.append("text")
                .attr("y", -10)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "black")
                .text(() => {
                    switch(dimension) {
                        case "experience_level": return "Experience Level";
                        case "employment_type": return "Employment Type";
                        case "remote_ratio": return "Remote Ratio (%)";
                        case "company_size": return "Company Size";
                        case "salary_in_usd": return "Salary (USD)";
                        default: return dimension;
                    }
                });
        });
        
        //create enhanced legend with color palette for all of the different data science jobs
        const legend = g3.append("g")
            .attr("transform", `translate(${parallelWidth + 30}, 20)`);
        
        legend.append("text")
            .attr("x", 0)
            .attr("y", -10)
            .attr("font-size", "13px")
            .attr("font-weight", "bold")
            .text("Job Categories");
        
        Object.entries(jobCategories).forEach(([category, color], i) => {
            const legendItem = legend.append("g")
                .attr("transform", `translate(0, ${i * 20})`);
            
            legendItem.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", color);
            
            legendItem.append("text")
                .attr("x", 20)
                .attr("y", 10)
                .attr("alignment-baseline", "middle")
                .attr("font-size", "11px")
                .text(category);
        });
        
        // add short statistics about the dataset below the plot
        const statsContainer = g3.append("g")
            .attr("transform", `translate(0, ${parallelHeight + 120})`);
        
        statsContainer.append("text")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text("Dataset Summary:");
        
        const stats = [
            `Total Records: ${processedFullData.length}`,
            `Unique Job Titles: ${new Set(processedFullData.map(d => d.job_title)).size}`,
            `Salary Range: $${d3.min(processedFullData, d => d.salary_in_usd).toLocaleString()} - $${d3.max(processedFullData, d => d.salary_in_usd).toLocaleString()}`,
            `Years: ${d3.min(processedFullData, d => d.work_year)} - ${d3.max(processedFullData, d => d.work_year)}`
        ];
        
        stats.forEach((stat, i) => {
            statsContainer.append("text")
                .attr("x", 0)
                .attr("y", 20 + i * 15)
                .attr("font-size", "11px")
                .text(stat);
        });
        
        // Initial visualization
        updateVisualization();
}