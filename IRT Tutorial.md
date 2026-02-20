# Understanding IRT Parameters

Item Response Theory (IRT) is a statistical framework for analyzing how well test questions measure ability. Instead of just knowing "70% of students got this right," IRT uses three parameters to describe each question.

## The Three Parameters

### Parameter a: Discrimination

**What it measures:** How effectively a question distinguishes between students who know the material and those who don't.

**Interpretation:**
- **Higher values**: Strong students get it right, weak students get it wrong - the question is doing its job well
- **Moderate values**: Decent separation between ability levels
- **Lower values**: Both strong and weak students have similar performance - question may be confusing or poorly written

### Parameter b: Difficulty

**What it measures:** The ability level at which a student has a 50% chance of answering correctly (accounting for guessing). In IRT, difficulty is on the same scale as ability.

**Understanding the scale:**
- **b = 0**: Average difficulty for an average-ability student
- **b < 0**: Easier than average (negative values = easier)
- **b > 0**: Harder than average (positive values = harder)

**Important note:** The relationship between percentage correct and the b parameter is complex and depends on the discrimination (a) and guessing (c) parameters. There is no simple conversion table. Proper calibration requires IRT software.

### Parameter c: Guessing

**What it measures:** The probability that a student with zero ability gets the question right by pure chance (the lower asymptote of the item response curve).

**Standard values by question type:**
- **4-option multiple choice with one correct answer**: c = 0.25
- **4-option multiple choice with two correct answers**: c = 0.50

The guessing parameter is typically fixed at (number of correct options)/(number of options) for multiple choice questions.

## Why These Parameters Matter

These parameters enable adaptive testing that:
- Presents questions matched to each student's ability level
- Focuses on questions that provide the most information about student knowledge
- Provides more accurate ability estimates with fewer questions

## Calibration Software

For accurate parameter estimation, you need specialized software that uses maximum likelihood or Bayesian estimation methods:

### R Packages
- [mirt](https://cran.r-project.org/web/packages/mirt/index.html) (most popular)
- [ltm](https://cran.r-project.org/web/packages/ltm/index.html)
- [TAM](https://cran.r-project.org/web/packages/TAM/index.html)

### Python Libraries
- [py-irt](https://pypi.org/project/py-irt/)
- [adaptivetesting](https://pypi.org/project/adaptivetesting/)

### Commercial Software
- [BILOG-MG](https://ssilive.com/bilogmg-operational)
- [IRTPRO](https://ssilive.com/irtpro-basic-12-months)

## Further Reading

For those interested in learning more about IRT:

- **Embretson, S. E., & Reise, S. P. (2000).** *Item Response Theory for Psychologists.* Lawrence Erlbaum Associates. (Accessible introduction to IRT concepts) [Purchase](https://www.amazon.ca/Psychologists-Multivariate-Applications-Embretson-2000-05-03/dp/B01FIWFNY2)

- **Baker, F. B., & Kim, S.-H. (2004).** *Item Response Theory: Parameter Estimation Techniques.* CRC Press. (Technical guide to calibration methods) [PDF](https://www.researchgate.net/publication/273588782_Item_Response_Theory_Parameter_Estimation_Techniques)

- **De Ayala, R. J. (2009).** *The Theory and Practice of Item Response Theory.* Guilford Press. (Comprehensive textbook) [PDF](https://www.researchgate.net/publication/227596113_RJ_DE_AYALA_2009_The_Theory_and_Practice_of_Item_Response_Theory)

## Online Resources

- [IRT Tutorial by Frank Baker](http://www.education.umd.edu/EDMS/tutorials/IRT/) - A comprehensive online tutorial
- [UCLA IDRE IRT Resources](https://stats.oarc.ucla.edu/r/seminars/irt/) - Practical guides with R examples
- [The R mirt Package Documentation](https://cran.r-project.org/web/packages/mirt/index.html) - Official documentation with examples